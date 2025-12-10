/**
 * Global configuration state for Potree.
 *
 * This module provides a centralized, mutable configuration object
 * that can be safely shared across all modules via ES module imports.
 */

export const config = {
	pointBudget: 2_000_000,
	framenumber: 0,
	numNodesLoading: 0,
	maxNodesLoading: 4,
	pointLoadLimit: 4_000_000,
	measureTimings: false,
};