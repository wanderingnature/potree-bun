/**
 * FetchFactory - Modern fetch-based replacement for XHRFactory
 * Maintains the same config pattern for headers and credentials
 */

const FetchFactory = {
	config: {
		withCredentials: false,
		customHeaders: [
			{ header: null, value: null }
		]
	},

	/**
	 * Build fetch options with configured headers and credentials
	 */
	getOptions(additionalOptions = {}) {
		const options = { ...additionalOptions };

		// Handle credentials
		if (this.config.withCredentials) {
			options.credentials = 'include';
		}

		// Handle custom headers
		if (this.config.customHeaders && Array.isArray(this.config.customHeaders)) {
			const headers = new Headers(options.headers || {});
			for (const customHeader of this.config.customHeaders) {
				if (customHeader.header && customHeader.value) {
					headers.set(customHeader.header, customHeader.value);
				}
			}
			options.headers = headers;
		}

		return options;
	},

	/**
	 * Fetch JSON data
	 */
	async fetchJson(url) {
		const options = this.getOptions();
		const response = await fetch(url, options);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}, url: ${url}`);
		}
		return response.json();
	},

	/**
	 * Fetch binary data as ArrayBuffer
	 */
	async fetchArrayBuffer(url) {
		const options = this.getOptions();
		const response = await fetch(url, options);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}, url: ${url}`);
		}
		return response.arrayBuffer();
	},

	/**
	 * Fetch text data
	 */
	async fetchText(url) {
		const options = this.getOptions();
		const response = await fetch(url, options);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}, url: ${url}`);
		}
		return response.text();
	},

	/**
	 * Check if a path exists (HEAD request)
	 */
	async pathExists(url) {
		try {
			const options = this.getOptions({ method: 'HEAD' });
			const response = await fetch(url, options);
			return response.ok;
		} catch {
			return false;
		}
	},

	/**
	 * Fetch with full response control (for cases needing status codes, headers, etc.)
	 */
	async fetch(url, options = {}) {
		const mergedOptions = this.getOptions(options);
		return fetch(url, mergedOptions);
	}
};

export { FetchFactory };