<script lang="ts">
	import { onMount } from 'svelte';
	import { RhyoliteApi } from '$lib/RhyoliteApi';
	import type { NodeOut } from '$lib/model';
	import { describeError, type UiError } from '$lib/errors';

	const api = RhyoliteApi.getInstance();

	let nodes: NodeOut[] = $state([]);
	let loading = $state(false);
	let creating = $state(false);
	let error: UiError | null = $state(null);

	// Search
	let kindsText = $state('');
	let queryText = $state('{\n  \n}');
	let limitText = $state('');

	// Create
	let kind = $state('');
	let payloadText = $state('{\n  \n}');

	function setError(e: unknown) {
		error = describeError(e);
	}

	function parseJsonObject(text: string, label: string): Record<string, unknown> {
		const v = text.trim();
		if (!v) return {};
		const parsed = JSON.parse(v) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error(`${label} must be a JSON object`);
		}
		return parsed as Record<string, unknown>;
	}

	function parseKinds(): string[] | null | undefined {
		const v = kindsText
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (v.length === 0) return null;
		return v;
	}

	function parseLimit(): number | null | undefined {
		const v = limitText.trim();
		if (!v) return null;
		const n = Number(v);
		if (!Number.isFinite(n) || n <= 0) throw new Error('Limit must be a positive number');
		return Math.floor(n);
	}

	async function search() {
		loading = true;
		error = null;
		try {
			const query = parseJsonObject(queryText, 'Query');
			nodes = await api.searchNodes({ kinds: parseKinds(), query, limit: parseLimit() });
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	async function refreshAll() {
		kindsText = '';
		queryText = '{\n  \n}';
		limitText = '';
		await search();
	}

	async function createNode() {
		creating = true;
		error = null;
		try {
			if (!kind.trim()) throw new Error('Kind is required');
			const payload = parseJsonObject(payloadText, 'Payload');
			await api.createNode({ kind: kind.trim(), payload });
			kind = '';
			payloadText = '{\n  \n}';
			await search();
		} catch (e) {
			setError(e);
		} finally {
			creating = false;
		}
	}

	async function removeNode(node: NodeOut) {
		if (!confirm(`Delete node ${node.id}?`)) return;
		loading = true;
		error = null;
		try {
			await api.deleteNode(node.id);
			await search();
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	function payloadPreview(node: NodeOut): string {
		try {
			const s = JSON.stringify(node.payload);
			return s.length > 80 ? s.slice(0, 77) + '…' : s;
		} catch {
			return '[unserializable]';
		}
	}

	onMount(refreshAll);
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<div class="flex items-end justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Nodes</h1>
			<p class="mt-1 text-sm text-slate-600">Create, search, and manage nodes.</p>
		</div>
		<button
			onclick={refreshAll}
			class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
			disabled={loading}
		>
			Refresh
		</button>
	</div>

	{#if error}
		<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
			<div class="text-sm font-semibold">{error.title}</div>
			<div class="mt-1 text-sm whitespace-pre-wrap text-rose-800">{error.message}</div>
			{#if error.details}
				<pre
					class="mt-2 max-h-60 overflow-auto rounded-lg border border-rose-200 bg-rose-100/40 p-3 text-xs text-rose-900">{error.details}</pre>
			{/if}
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-6">
		<section class="space-y-6 lg:col-span-2">
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 class="text-sm font-semibold">Create node</h2>
				<div class="mt-4 space-y-3">
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Kind</span>
						<input
							bind:value={kind}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. Person"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Payload (JSON object)</span>
						<textarea
							bind:value={payloadText}
							rows={8}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none focus:border-slate-400"
							spellcheck="false"
						></textarea>
					</label>

					<button
						onclick={createNode}
						class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
						disabled={creating}
					>
						{creating ? 'Creating…' : 'Create'}
					</button>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 class="text-sm font-semibold">Search</h2>
				<div class="mt-4 space-y-3">
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Kinds (comma separated)</span>
						<input
							bind:value={kindsText}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. Person,Company"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Query (JSON object)</span>
						<textarea
							bind:value={queryText}
							rows={7}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none focus:border-slate-400"
							spellcheck="false"
						></textarea>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Limit</span>
						<input
							bind:value={limitText}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. 50"
						/>
					</label>
					<div class="flex items-center gap-2">
						<button
							onclick={search}
							class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
							disabled={loading}
						>
							{loading ? 'Searching…' : 'Search'}
						</button>
						<button
							onclick={refreshAll}
							class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
							disabled={loading}
						>
							Reset
						</button>
					</div>
				</div>
			</div>
		</section>

		<section class="lg:col-span-4">
			<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div class="border-b border-slate-200 px-5 py-4">
					<h2 class="text-sm font-semibold">Results</h2>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200 text-sm">
						<thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
							<tr>
								<th class="px-5 py-3">ID</th>
								<th class="px-5 py-3">Kind</th>
								<th class="px-5 py-3">Payload</th>
								<th class="px-5 py-3">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200">
							{#if loading}
								<tr><td class="px-5 py-4 text-slate-500" colspan="4">Loading…</td></tr>
							{:else if nodes.length === 0}
								<tr><td class="px-5 py-4 text-slate-500" colspan="4">No nodes found.</td></tr>
							{:else}
								{#each nodes as node (node.id)}
									<tr class="hover:bg-slate-50">
										<td class="px-5 py-4 font-mono text-xs text-slate-700">{node.id}</td>
										<td class="px-5 py-4 font-medium text-slate-900">{node.kind}</td>
										<td class="px-5 py-4 font-mono text-xs text-slate-600"
											>{payloadPreview(node)}</td
										>
										<td class="px-5 py-4">
											<div class="flex items-center gap-2">
												<a
													href={`/nodes/${node.id}`}
													class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
												>
													Open
												</a>
												<button
													onclick={() => removeNode(node)}
													class="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	</div>
</div>
