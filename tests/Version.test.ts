import { describe, expect, it } from 'bun:test';
import { Version } from '../src/Version.js';

describe('Version', () => {
	describe('constructor', () => {
		it('should parse major.minor version string', () => {
			const v = new Version('1.8');
			expect(v.versionMajor).toBe(1);
			expect(v.versionMinor).toBe(8);
			expect(v.version).toBe('1.8');
		});

		it('should parse major only version string', () => {
			const v = new Version('2');
			expect(v.versionMajor).toBe(2);
			// Note: Version class returns NaN for missing minor version
			expect(Number.isNaN(v.versionMinor)).toBe(true);
		});

		it('should handle version with patch number', () => {
			const v = new Version('1.4.2');
			expect(v.versionMajor).toBe(1);
			expect(v.versionMinor).toBe(4);
		});
	});

	describe('newerThan', () => {
		it('should return true when major version is greater', () => {
			const v = new Version('2.0');
			expect(v.newerThan('1.9')).toBe(true);
			expect(v.newerThan('1.0')).toBe(true);
		});

		it('should return true when minor version is greater with same major', () => {
			const v = new Version('1.5');
			expect(v.newerThan('1.4')).toBe(true);
			expect(v.newerThan('1.0')).toBe(true);
		});

		it('should return false when versions are equal', () => {
			const v = new Version('1.5');
			expect(v.newerThan('1.5')).toBe(false);
		});

		it('should return false when version is older', () => {
			const v = new Version('1.4');
			expect(v.newerThan('1.5')).toBe(false);
			expect(v.newerThan('2.0')).toBe(false);
		});
	});

	describe('equalOrHigher', () => {
		it('should return true when versions are equal', () => {
			const v = new Version('1.5');
			expect(v.equalOrHigher('1.5')).toBe(true);
		});

		it('should return true when version is higher', () => {
			const v = new Version('1.6');
			expect(v.equalOrHigher('1.5')).toBe(true);
			expect(v.equalOrHigher('1.4')).toBe(true);
		});

		it('should return true when major version is higher', () => {
			const v = new Version('2.0');
			expect(v.equalOrHigher('1.9')).toBe(true);
		});

		it('should return false when version is lower', () => {
			const v = new Version('1.4');
			expect(v.equalOrHigher('1.5')).toBe(false);
			expect(v.equalOrHigher('2.0')).toBe(false);
		});
	});

	describe('upTo', () => {
		it('should return true when version is equal', () => {
			const v = new Version('1.5');
			expect(v.upTo('1.5')).toBe(true);
		});

		it('should return true when version is lower', () => {
			const v = new Version('1.4');
			expect(v.upTo('1.5')).toBe(true);
			expect(v.upTo('2.0')).toBe(true);
		});

		it('should return false when version is higher', () => {
			const v = new Version('1.6');
			expect(v.upTo('1.5')).toBe(false);
		});

		it('should return false when major version is higher', () => {
			const v = new Version('2.0');
			expect(v.upTo('1.9')).toBe(false);
		});
	});
});
