# TinyKv

[![JSR](https://jsr.io/badges/@stordahl/tiny-kv)](https://jsr.io/@stordahl/tiny-kv)

A tiny in-memory key-value store with schema validation and TTL support for TypeScript/JavaScript applications.

## Overview

TinyKv is a lightweight, in-memory key-value store that provides:
- Schema validation using Standard Schema
- TTL (time-to-live) expiration with active cleanup
- Type-safe key and value operations
- Simple API for common KV operations

## Usage

```typescript
import { TinyKv } from 'tiny-kv';
import * as v from 'valibot';

// Basic usage without schemas
const kv = new TinyKv();
await kv.set('user:123', { name: 'John', age: 30 });
const user = kv.get('user:123'); // { name: 'John', age: 30 }

// With schema validation
const valueSchema = v.object({
  name: v.string(),
  age: v.number(),
});

const typedKv = new TinyKv({ valueSchema });
await typedKv.set('user:123', { name: 'John', age: 30 });
await typedKv.set('user:123', { name: 'John' }); // Throws validation error

// With TTL expiration
await kv.set('session:abc', data, { ex: 5000 }); // Expires in 5 seconds
kv.exists('session:abc'); // true (if not expired)
kv.isExpired('session:abc'); // false/true based on time

// Available methods
kv.get(key);           // Get value or null
kv.set(key, value, opts); // Set value with optional TTL
kv.delete(key);        // Delete key
kv.exists(key);        // Check if key exists
kv.isExpired(key);     // Check if key is expired
kv.getExpiration(key); // Get expiration timestamp
kv.size();             // Get storage size
kv.cleanup();          // Clear all data and stop cleanup
```

## Installation

TinyKv is published to JSR under my personal scope.

```shell
npx jsr add @stordahl/tiny-kv  # npm
pnpm i jsr:@stordahl/tiny-kv   # pnpm
deno add jsr:@stordahl/tiny-kv # deno
bunx jsr add @stordahl/tiny-kv # bun
```
