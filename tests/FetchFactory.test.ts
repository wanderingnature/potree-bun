import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { FetchFactory } from '../src/FetchFactory.js';

describe('FetchFactory', () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		// Reset config before each test
		FetchFactory.config = {
			withCredentials: false,
			customHeaders: [{ header: null, value: null }]
		};
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	describe('config', () => {
		it('should have default config', () => {
			expect(FetchFactory.config.withCredentials).toBe(false);
			expect(FetchFactory.config.customHeaders).toEqual([{ header: null, value: null }]);
		});

		it('should allow config modification', () => {
			FetchFactory.config.withCredentials = true;
			FetchFactory.config.customHeaders = [{ header: 'X-Custom', value: 'test' }];

			expect(FetchFactory.config.withCredentials).toBe(true);
			expect(FetchFactory.config.customHeaders[0].header).toBe('X-Custom');
		});
	});

	describe('getOptions', () => {
		it('should return empty options by default', () => {
			const options = FetchFactory.getOptions();
			expect(options.credentials).toBeUndefined();
		});

		it('should include credentials when configured', () => {
			FetchFactory.config.withCredentials = true;
			const options = FetchFactory.getOptions();
			expect(options.credentials).toBe('include');
		});

		it('should merge custom headers', () => {
			FetchFactory.config.customHeaders = [{ header: 'X-Test', value: 'value1' }];
			const options = FetchFactory.getOptions();
			expect(options.headers).toBeDefined();
			expect((options.headers as Headers).get('X-Test')).toBe('value1');
		});

		it('should ignore null headers', () => {
			FetchFactory.config.customHeaders = [{ header: null, value: null }];
			const options = FetchFactory.getOptions();
			// Should not throw and headers might be empty or undefined
			expect(options).toBeDefined();
		});

		it('should merge with additional options', () => {
			const options = FetchFactory.getOptions({ method: 'POST' });
			expect(options.method).toBe('POST');
		});
	});

	describe('fetchJson', () => {
		it('should fetch and parse JSON', async () => {
			const mockData = { test: 'data' };
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response(JSON.stringify(mockData), { status: 200 }))
			);

			const result = await FetchFactory.fetchJson('https://example.com/data.json');
			expect(result).toEqual(mockData);
		});

		it('should throw on non-OK response', async () => {
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response('Not found', { status: 404 }))
			);

			expect(FetchFactory.fetchJson('https://example.com/missing.json')).rejects.toThrow();
		});
	});

	describe('fetchArrayBuffer', () => {
		it('should fetch and return ArrayBuffer', async () => {
			const testBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response(testBuffer, { status: 200 }))
			);

			const result = await FetchFactory.fetchArrayBuffer('https://example.com/data.bin');
			expect(result.byteLength).toBe(4);
		});

		it('should throw on non-OK response', async () => {
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response('Error', { status: 500 }))
			);

			expect(FetchFactory.fetchArrayBuffer('https://example.com/data.bin')).rejects.toThrow();
		});
	});

	describe('fetchText', () => {
		it('should fetch and return text', async () => {
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response('Hello World', { status: 200 }))
			);

			const result = await FetchFactory.fetchText('https://example.com/text.txt');
			expect(result).toBe('Hello World');
		});
	});

	describe('pathExists', () => {
		it('should return true for existing path', async () => {
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response('', { status: 200 }))
			);

			const exists = await FetchFactory.pathExists('https://example.com/exists');
			expect(exists).toBe(true);
		});

		it('should return false for non-existing path', async () => {
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response('', { status: 404 }))
			);

			const exists = await FetchFactory.pathExists('https://example.com/missing');
			expect(exists).toBe(false);
		});

		it('should return false on network error', async () => {
			globalThis.fetch = mock(() => Promise.reject(new Error('Network error')));

			const exists = await FetchFactory.pathExists('https://example.com/error');
			expect(exists).toBe(false);
		});
	});

	describe('fetch', () => {
		it('should make a raw fetch request', async () => {
			globalThis.fetch = mock(() =>
				Promise.resolve(new Response('OK', { status: 200 }))
			);

			const response = await FetchFactory.fetch('https://example.com/resource');
			expect(response.status).toBe(200);
		});

		it('should pass through options', async () => {
			let capturedOptions: RequestInit = {};
			globalThis.fetch = mock((url: string, options?: RequestInit) => {
				capturedOptions = options || {};
				return Promise.resolve(new Response('OK', { status: 200 }));
			});

			await FetchFactory.fetch('https://example.com/resource', { method: 'POST' });
			expect(capturedOptions.method).toBe('POST');
		});
	});
});
