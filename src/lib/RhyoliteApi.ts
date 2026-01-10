import { getGlobalConfig } from './config';

import type {
	AttachmentOut,
	EdgeCreate,
	EdgeOut,
	EdgesKindCreate,
	EdgesKindOut,
	HealthStatus,
	KindCreate,
	KindOut,
	NodeCreate,
	NodeOut,
	NodeUpdate,
	SearchDatamodel,
	UUID
} from './model';

export class RhyoliteApiError extends Error {
	readonly status: number;
	readonly statusText?: string;
	readonly method?: string;
	readonly url: string;
	readonly details?: unknown;

	constructor(
		message: string,
		opts: { status: number; statusText?: string; method?: string; url: string; details?: unknown }
	) {
		super(message);
		this.name = 'RhyoliteApiError';
		this.status = opts.status;
		this.statusText = opts.statusText;
		this.method = opts.method;
		this.url = opts.url;
		this.details = opts.details;
	}
}

export class RhyoliteApi {
	protected static instance: RhyoliteApi;
	protected apiServiceUrl: string;
	private fetchFn: typeof fetch;

	/**
	 * Get the singleton instance of UploadService
	 * @returns The UploadService instance
	 */
	static getInstance(): RhyoliteApi {
		if (!RhyoliteApi.instance) {
			RhyoliteApi.instance = new RhyoliteApi();
		}
		return RhyoliteApi.instance;
	}

	private constructor(baseUrl?: string) {
		this.apiServiceUrl = baseUrl || getGlobalConfig().apiServiceUrl;
		this.fetchFn = fetch;
	}

	/**
	 * Allows injecting SvelteKit's event.fetch for SSR/load functions.
	 */
	setFetch(fetchFn: typeof fetch) {
		this.fetchFn = fetchFn;
	}

	setBaseUrl(baseUrl: string) {
		this.apiServiceUrl = baseUrl;
	}

	private buildUrl(
		path: string,
		query?: Record<string, string | number | boolean | null | undefined>
	): string {
		const base = this.apiServiceUrl.endsWith('/') ? this.apiServiceUrl : `${this.apiServiceUrl}/`;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		const url = new URL(normalizedPath, base);
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value === undefined || value === null) continue;
				url.searchParams.set(key, String(value));
			}
		}
		return url.toString();
	}

	private async parseErrorDetails(response: Response): Promise<unknown> {
		const contentType = response.headers.get('content-type') || '';
		try {
			if (contentType.includes('application/json')) {
				return await response.json();
			}
			return await response.text();
		} catch {
			return undefined;
		}
	}

	private async request<T>(opts: {
		method: 'GET' | 'POST' | 'PUT' | 'DELETE';
		path: string;
		query?: Record<string, string | number | boolean | null | undefined>;
		body?: unknown;
		headers?: Record<string, string>;
		responseType?: 'json' | 'blob' | 'text';
	}): Promise<T> {
		const url = this.buildUrl(opts.path, opts.query);
		const headers: Record<string, string> = { ...(opts.headers || {}) };
		let body: BodyInit | undefined;

		if (opts.body instanceof FormData) {
			body = opts.body;
		} else if (opts.body !== undefined) {
			headers['content-type'] = headers['content-type'] ?? 'application/json';
			body = JSON.stringify(opts.body);
		}

		const response = await this.fetchFn(url, {
			method: opts.method,
			headers,
			body
		});

		if (!response.ok) {
			const details = await this.parseErrorDetails(response);
			throw new RhyoliteApiError(`Request failed (${response.status})`, {
				status: response.status,
				statusText: response.statusText,
				method: opts.method,
				url,
				details
			});
		}

		const responseType = opts.responseType ?? 'json';
		if (responseType === 'blob') return (await response.blob()) as T;
		if (responseType === 'text') return (await response.text()) as T;

		// json (default) - tolerate empty bodies
		try {
			return (await response.json()) as T;
		} catch {
			return undefined as T;
		}
	}

	test() {
		return `API Service URL is: ${this.apiServiceUrl}`;
	}

	// --- Health ---

	healty(): Promise<HealthStatus> {
		return this.request({ method: 'GET', path: '/healty' });
	}

	// --- Kinds ---

	createKind(payload: KindCreate): Promise<KindOut> {
		return this.request({ method: 'POST', path: '/kind', body: payload });
	}

	getKind(name: string): Promise<KindOut> {
		return this.request({ method: 'GET', path: `/kind/${encodeURIComponent(name)}` });
	}

	deleteKind(name: string): Promise<unknown> {
		return this.request({ method: 'DELETE', path: `/kind/${encodeURIComponent(name)}` });
	}

	listKinds(): Promise<KindOut[]> {
		return this.request({ method: 'GET', path: '/kinds' });
	}

	// --- EdgesKinds (schema) ---

	createEdgesKind(payload: EdgesKindCreate): Promise<EdgesKindOut> {
		return this.request({ method: 'POST', path: '/edges-kind', body: payload });
	}

	listEdgesKinds(): Promise<EdgesKindOut[]> {
		return this.request({ method: 'GET', path: '/edges-kinds' });
	}

	listEdgesKindsFrom(fromKind: string): Promise<EdgesKindOut[]> {
		return this.request({
			method: 'GET',
			path: `/edges-kinds/${encodeURIComponent(fromKind)}`
		});
	}

	listEdgesKindsFromTo(fromKind: string, toKind: string): Promise<EdgesKindOut[]> {
		return this.request({
			method: 'GET',
			path: `/edges-kinds/${encodeURIComponent(fromKind)}/${encodeURIComponent(toKind)}`
		});
	}

	getEdgesKind(fromKind: string, toKind: string, relation: string): Promise<EdgesKindOut> {
		return this.request({
			method: 'GET',
			path: `/edges-kinds/${encodeURIComponent(fromKind)}/${encodeURIComponent(toKind)}/${encodeURIComponent(relation)}`
		});
	}

	deleteEdgesKind(fromKind: string, toKind: string, relation: string): Promise<unknown> {
		return this.request({
			method: 'DELETE',
			path: `/edges-kind/${encodeURIComponent(fromKind)}/${encodeURIComponent(toKind)}/${encodeURIComponent(relation)}`
		});
	}

	// --- Nodes ---

	createNode(payload: NodeCreate): Promise<NodeOut> {
		return this.request({ method: 'POST', path: '/node', body: payload });
	}

	getNode(id: UUID): Promise<NodeOut> {
		return this.request({ method: 'GET', path: `/node/${encodeURIComponent(id)}` });
	}

	updateNode(id: UUID, payload: NodeUpdate): Promise<NodeOut> {
		return this.request({ method: 'PUT', path: `/node/${encodeURIComponent(id)}`, body: payload });
	}

	deleteNode(id: UUID): Promise<unknown> {
		return this.request({ method: 'DELETE', path: `/node/${encodeURIComponent(id)}` });
	}

	searchNodes(payload: SearchDatamodel): Promise<NodeOut[]> {
		return this.request({ method: 'POST', path: '/nodes/search', body: payload });
	}

	// --- Edges ---

	createEdge(payload: EdgeCreate): Promise<EdgeOut> {
		return this.request({ method: 'POST', path: '/edge', body: payload });
	}

	outgoingEdges(nodeId: UUID): Promise<EdgeOut[]> {
		return this.request({
			method: 'GET',
			path: `/outgoing-edges/${encodeURIComponent(nodeId)}`
		});
	}

	incomingEdges(nodeId: UUID): Promise<EdgeOut[]> {
		return this.request({
			method: 'GET',
			path: `/incoming-edges/${encodeURIComponent(nodeId)}`
		});
	}

	edgesBetween(fromId: UUID, toId: UUID): Promise<EdgeOut[]> {
		return this.request({
			method: 'GET',
			path: `/edges/${encodeURIComponent(fromId)}/${encodeURIComponent(toId)}`
		});
	}

	deleteEdge(fromId: UUID, toId: UUID, relation: string): Promise<unknown> {
		return this.request({
			method: 'DELETE',
			path: `/edge/${encodeURIComponent(fromId)}/${encodeURIComponent(toId)}/${encodeURIComponent(relation)}`
		});
	}

	// --- Attachments ---

	createAttachment(opts: {
		nodeId: UUID;
		file: Blob;
		name?: string | null;
		filename?: string;
	}): Promise<AttachmentOut> {
		const form = new FormData();
		form.append('node_id', opts.nodeId);
		if (opts.filename) {
			form.append('file', opts.file, opts.filename);
		} else {
			form.append('file', opts.file);
		}

		return this.request({
			method: 'POST',
			path: '/attachment',
			query: { name: opts.name ?? undefined },
			body: form
		});
	}

	/**
	 * Response schema is unspecified in OpenAPI. Use `as: 'blob'` for downloads.
	 */
	getAttachment(id: UUID, opts?: { as?: 'json' | 'blob' | 'text' }): Promise<unknown> {
		return this.request({
			method: 'GET',
			path: `/attachment/${encodeURIComponent(id)}`,
			responseType: opts?.as ?? 'json'
		});
	}

	deleteAttachment(id: UUID): Promise<unknown> {
		return this.request({ method: 'DELETE', path: `/attachment/${encodeURIComponent(id)}` });
	}

	listAttachments(nodeId: UUID): Promise<AttachmentOut[]> {
		return this.request({ method: 'GET', path: `/attachments/${encodeURIComponent(nodeId)}` });
	}
}
