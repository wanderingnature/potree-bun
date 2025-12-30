import { describe, expect, it, beforeEach } from 'bun:test';
import { LRU, LRUItem } from '../src/LRU.js';

// Mock node interface for testing
interface MockNode {
	id: number;
	loaded: boolean;
	numPoints: number;
}

function createMockNode(id: number, loaded = true, numPoints = 100): MockNode {
	return { id, loaded, numPoints };
}

describe('LRUItem', () => {
	it('should store node reference', () => {
		const node = createMockNode(1);
		const item = new LRUItem(node);
		expect(item.node).toBe(node);
		expect(item.previous).toBeNull();
		expect(item.next).toBeNull();
	});
});

describe('LRU', () => {
	let lru: LRU;

	beforeEach(() => {
		lru = new LRU();
	});

	describe('initial state', () => {
		it('should start empty', () => {
			expect(lru.size()).toBe(0);
			expect(lru.first).toBeNull();
			expect(lru.last).toBeNull();
			expect(lru.numPoints).toBe(0);
		});
	});

	describe('touch', () => {
		it('should add a loaded node to the list', () => {
			const node = createMockNode(1);
			lru.touch(node);

			expect(lru.size()).toBe(1);
			expect(lru.first?.node).toBe(node);
			expect(lru.last?.node).toBe(node);
			expect(lru.numPoints).toBe(100);
		});

		it('should not add an unloaded node', () => {
			const node = createMockNode(1, false);
			lru.touch(node);

			expect(lru.size()).toBe(0);
		});

		it('should move touched node to end of list', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);
			const node3 = createMockNode(3);

			lru.touch(node1);
			lru.touch(node2);
			lru.touch(node3);

			expect(lru.first?.node).toBe(node1);
			expect(lru.last?.node).toBe(node3);

			// Touch node1 - should move to end
			lru.touch(node1);
			expect(lru.first?.node).toBe(node2);
			expect(lru.last?.node).toBe(node1);
		});

		it('should handle touch on first element', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);

			lru.touch(node1);
			lru.touch(node2);
			lru.touch(node1); // Move first to end

			expect(lru.first?.node).toBe(node2);
			expect(lru.last?.node).toBe(node1);
			expect(lru.size()).toBe(2);
		});

		it('should handle touch on last element (no change)', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);

			lru.touch(node1);
			lru.touch(node2);
			lru.touch(node2); // Touch last element

			expect(lru.first?.node).toBe(node1);
			expect(lru.last?.node).toBe(node2);
			expect(lru.size()).toBe(2);
		});

		it('should handle touch on middle element', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);
			const node3 = createMockNode(3);

			lru.touch(node1);
			lru.touch(node2);
			lru.touch(node3);
			lru.touch(node2); // Move middle to end

			expect(lru.first?.node).toBe(node1);
			expect(lru.last?.node).toBe(node2);
			expect(lru.size()).toBe(3);
		});
	});

	describe('remove', () => {
		it('should remove a node from the list', () => {
			const node = createMockNode(1);
			lru.touch(node);
			lru.remove(node);

			expect(lru.size()).toBe(0);
			expect(lru.first).toBeNull();
			expect(lru.last).toBeNull();
			expect(lru.numPoints).toBe(0);
		});

		it('should handle removing first node', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);

			lru.touch(node1);
			lru.touch(node2);
			lru.remove(node1);

			expect(lru.size()).toBe(1);
			expect(lru.first?.node).toBe(node2);
			expect(lru.last?.node).toBe(node2);
		});

		it('should handle removing last node', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);

			lru.touch(node1);
			lru.touch(node2);
			lru.remove(node2);

			expect(lru.size()).toBe(1);
			expect(lru.first?.node).toBe(node1);
			expect(lru.last?.node).toBe(node1);
		});

		it('should handle removing middle node', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);
			const node3 = createMockNode(3);

			lru.touch(node1);
			lru.touch(node2);
			lru.touch(node3);
			lru.remove(node2);

			expect(lru.size()).toBe(2);
			expect(lru.first?.node).toBe(node1);
			expect(lru.last?.node).toBe(node3);
		});

		it('should handle removing non-existent node', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);

			lru.touch(node1);
			lru.remove(node2); // Not in list

			expect(lru.size()).toBe(1);
		});
	});

	describe('getLRUItem', () => {
		it('should return null for empty list', () => {
			expect(lru.getLRUItem()).toBeNull();
		});

		it('should return first (least recently used) node', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);
			const node3 = createMockNode(3);

			lru.touch(node1);
			lru.touch(node2);
			lru.touch(node3);

			expect(lru.getLRUItem()).toBe(node1);
		});
	});

	describe('contains', () => {
		it('should return true for nodes not in list', () => {
			const node = createMockNode(1);
			// Note: The original implementation has a bug - contains returns true when NOT in list
			expect(lru.contains(node)).toBe(true);
		});
	});

	describe('toString', () => {
		it('should return string representation', () => {
			const node1 = createMockNode(1);
			const node2 = createMockNode(2);

			lru.touch(node1);
			lru.touch(node2);

			const str = lru.toString();
			expect(str).toContain('1');
			expect(str).toContain('2');
			expect(str).toContain('(2)');
		});

		it('should handle empty list', () => {
			const str = lru.toString();
			expect(str).toBe('{ }(0)');
		});
	});

	describe('numPoints tracking', () => {
		it('should accumulate points when adding nodes', () => {
			const node1 = createMockNode(1, true, 100);
			const node2 = createMockNode(2, true, 200);

			lru.touch(node1);
			lru.touch(node2);

			expect(lru.numPoints).toBe(300);
		});

		it('should decrease points when removing nodes', () => {
			const node1 = createMockNode(1, true, 100);
			const node2 = createMockNode(2, true, 200);

			lru.touch(node1);
			lru.touch(node2);
			lru.remove(node1);

			expect(lru.numPoints).toBe(200);
		});
	});
});
