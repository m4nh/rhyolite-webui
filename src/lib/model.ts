export type UUID = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface ValidationError {
	loc: Array<string | number>;
	msg: string;
	type: string;
}

export interface HTTPValidationError {
	detail?: ValidationError[];
}

export interface KindCreate {
	name: string;
	schema: Record<string, unknown>;
}

export interface KindOut {
	name: string;
	schema: Record<string, unknown>;
}

export interface EdgesKindCreate {
	from_kind: string;
	to_kind: string;
	relation: string;
}

export interface EdgesKindOut {
	from_kind: string;
	to_kind: string;
	relation: string;
}

export interface NodeCreate {
	kind: string;
	payload?: Record<string, unknown>;
}

export interface NodeUpdate {
	payload: Record<string, unknown>;
}

export interface NodeOut {
	id: UUID;
	kind: string;
	created_at: string;
	updated_at: string;
	payload: Record<string, unknown>;
}

export interface SearchDatamodel {
	kinds?: string[] | null;
	query?: Record<string, unknown>;
	limit?: number | null;
}

export interface EdgeCreate {
	from_id: UUID;
	to_id: UUID;
	relation: string;
}

export interface EdgeOut {
	from_id: UUID;
	to_id: UUID;
	relation: string;
	created_at: string;
}

export interface AttachmentOut {
	id: UUID;
	node_id: UUID;
	mime_type: string;
	name: string;
	created_at: string;
}

export interface BodyCreateAttachment {
	node_id: UUID;
	file: Blob;
}

// Example healty from server
export interface HealthStatus {
	ok: boolean;
	db_schema_ready: boolean;
	allowed_origins: string[];
	time: string;
}
