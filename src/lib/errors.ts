import type { HTTPValidationError, ValidationError } from './model';
import { RhyoliteApiError } from './RhyoliteApi';

export interface UiError {
	title: string;
	message: string;
	details?: string;
}

function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function isValidationError(value: unknown): value is ValidationError {
	return (
		!!value && typeof value === 'object' && 'loc' in value && 'msg' in value && 'type' in value
	);
}

function formatValidationDetails(details: HTTPValidationError): string | undefined {
	const rawDetail = details.detail as unknown;

	if (rawDetail == null) return undefined;
	if (typeof rawDetail === 'string') return rawDetail;

	if (!Array.isArray(rawDetail)) {
		// Some backends return a non-array `detail` (object/number/etc.)
		return safeStringify(rawDetail);
	}

	if (rawDetail.length === 0) return undefined;

	const lines = rawDetail.map((item) => {
		if (isValidationError(item)) {
			const loc = Array.isArray(item.loc) ? item.loc.join('.') : String(item.loc);
			return `${loc}: ${item.msg} (${item.type})`;
		}
		if (typeof item === 'string') return item;
		return safeStringify(item);
	});

	return lines.join('\n');
}

export function describeError(e: unknown): UiError {
	if (e instanceof RhyoliteApiError) {
		const title = `Request failed (${e.status}${e.statusText ? ` ${e.statusText}` : ''})`;
		const message = `URL: ${e.url}${e.method ? `\nMethod: ${e.method}` : ''}`;

		let details: string | undefined;
		if (e.details && typeof e.details === 'object') {
			// FastAPI style validation errors
			const maybeValidation = e.details as HTTPValidationError;
			details = formatValidationDetails(maybeValidation) ?? safeStringify(e.details);
		} else if (typeof e.details === 'string') {
			details = e.details;
		} else if (e.details !== undefined) {
			details = safeStringify(e.details);
		}

		return {
			title,
			message,
			details
		};
	}

	// Fetch/network failures often surface as TypeError in browsers
	if (e instanceof TypeError) {
		return {
			title: 'Network error',
			message: e.message
		};
	}

	if (e instanceof Error) {
		return {
			title: e.name || 'Error',
			message: e.message
		};
	}

	return {
		title: 'Error',
		message: String(e)
	};
}
