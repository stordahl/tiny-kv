import type { StandardSchemaV1 } from "@standard-schema/spec";


/**
  * TODO:
  * - error handling
  * - logging hooks
  * - implement persistence via sqlite
  */

type InferKey<KSchema extends StandardSchemaV1 | undefined> = 
  KSchema extends StandardSchemaV1 ? Awaited<StandardSchemaV1.InferOutput<KSchema>> : string;
type InferValue<VSchema extends StandardSchemaV1 | undefined> = 
  VSchema extends StandardSchemaV1 ? Awaited<StandardSchemaV1.InferOutput<VSchema>> : unknown;

/**
  * @example
  * ```typescript
  * import * as v from 'valibot'
  *
  * const exampleKey = 1234
  * const valueSchema = v.object({
  *   name: v.string(),
  *   age: v.number(),
  * })
  *
  * const tiny = new TinyKv({ valueSchema })
  * await tiny.set(exampleKey, { name: 'John Doe', age: 32 })
  * tiny.exists(exampleKey) // true
  * tiny.get(exampleKey) // { name: 'John Doe', age: 32 }
  * ```
  * */
export class TinyKv<
  KSchema extends StandardSchemaV1 | undefined = undefined,
  VSchema extends StandardSchemaV1 | undefined = undefined,
> {
  #storage = new Map<InferKey<KSchema>, InferValue<VSchema>>();
  #exMap = new Map<InferKey<KSchema>, number>();
  #activeExStrategyIntervalId: ReturnType<typeof setInterval> | undefined = undefined;
  //#hooks = new Map<HookName,HookCallback>; 
  keySchema: KSchema;
  valueSchema: VSchema;

  constructor(args: { keySchema?: KSchema; valueSchema?: VSchema; } = {}) {
    this.keySchema = args.keySchema as KSchema;
    this.valueSchema = args.valueSchema as VSchema;
    this.#activeExStrategyIntervalId = setInterval(() => {
      this.#runActiveExpiration(Date.now()); 
    }, 1000)
  }

  public get(key: InferKey<KSchema>) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null 
    }
    return this.#storage.get(key) ?? null; 
  }

  public async set(key: InferKey<KSchema>, value: InferValue<VSchema>, opts?: { ex: number; }) {
    let finalKey: InferKey<KSchema> = key;
    let finalValue: InferValue<VSchema> = value;
    if (this.keySchema) {
      finalKey = await this.#validate(this.keySchema, key) as InferKey<KSchema>;
    }
    if (this.valueSchema) {
      finalValue = await this.#validate(this.valueSchema, value) as InferValue<VSchema>;
    }
    this.#storage.set(finalKey, finalValue);
    if (opts?.ex) this.#exMap.set(finalKey, opts.ex);
    return this;
  }

  public delete(key: InferKey<KSchema>) {
    this.#storage.delete(key); 
    this.#exMap.delete(key);
    return this;
  }

  public exists(key: InferKey<KSchema>) {
    if (this.isExpired(key)) {
      this.delete(key);
      return false 
    }
    return this.#storage.has(key); 
  }

  public isExpired(key: InferKey<KSchema>) {
    if (!this.#exMap.has(key)) {
      return undefined;
    } 
    return (Date.now() > this.#exMap.get(key)!);
  }

  public getExpiration(key: InferKey<KSchema>) {
    if (!this.#exMap.has(key)) {
      console.error(`Key ${key} does not have an expiration set`)
      return undefined;
    } 
    return this.#exMap.get(key);
  }

  public cleanup() {
    this.#storage.clear();
    this.#exMap.clear()
    clearInterval(this.#activeExStrategyIntervalId);
  }

  /*
  public on(hookName: HookName, callback: HookCallback) {
    this.#hooks.set(hookName, callback);
  }
  */

  async #validate<T extends StandardSchemaV1>(
    schema: T, 
    input: StandardSchemaV1.InferInput<T>
  ): Promise<Awaited<StandardSchemaV1.InferOutput<T>>> {
    const result = await schema?.["~standard"].validate(input);

    if (result && typeof result === 'object' && 'issues' in result && result.issues) {
      throw new Error(JSON.stringify(result.issues, null, 2));
    }

    return (result as any)?.value;
  }

  #runActiveExpiration(currentTimestamp: number) {
    const sample = buildMapSample(this.#exMap);
    let hitCount = 0;
    sample.forEach((timestamp, key) => {
      if (currentTimestamp <= timestamp) {
        hitCount++;
        this.#storage.delete(key);
        this.#exMap.delete(key);
      }
    });
    if ((hitCount / sample.size) >= 0.25) {
      this.#runActiveExpiration(Date.now());
    }
  }
}

function buildMapSample<K = unknown, V = unknown>(map: Map<K,V>, rate = 0.25) {
    const count = map.size * rate;
    const keys = Array.from(map.keys());
    const shuffledKeys = keys.sort(() => 0.5 - Math.random()); // Simple shuffle
    const sampledEntries = new Map();

    for (let i = 0; i < Math.min(count, shuffledKeys.length); i++) {
      const key = shuffledKeys[i]!;
      sampledEntries.set(key, map.get(key));
    }
    return sampledEntries as Map<K,V>;
}

/*
type HookName = |
  "cleanup" |
  "error" |
  "expiration" |
  "validationError";

type HookCallback = (...args: any[]) => unknown;
*/
