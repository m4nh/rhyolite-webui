<script lang="ts">
	import { page } from '$app/stores';
	import { RhyoliteApi } from '$lib/RhyoliteApi';
	import type { EdgeOut, NodeOut, UUID } from '$lib/model';
	import { describeError, type UiError } from '$lib/errors';

	const api = RhyoliteApi.getInstance();

	let node: NodeOut | null = $state(null);
	let loading = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let error: UiError | null = $state(null);

	let payloadText = $state('{\n  \n}');

	let outgoing: EdgeOut[] = $state([]);
	let incoming: EdgeOut[] = $state([]);

	// Create link
	let toId = $state('');
	let relation = $state('');
	let linking = $state(false);

	// Search helper
	let searchQueryText = $state('{\n  \n}');
	let searchKindsText = $state('');
	let searchResults: NodeOut[] = $state([]);
	let searching = $state(false);

	let id = $derived(($page.params.id ?? '') as UUID);

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

	function parseKinds(text: string): string[] | null {
		const v = text
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		return v.length ? v : null;
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			node = await api.getNode(id);
			payloadText = JSON.stringify(node.payload ?? {}, null, 2);
			await refreshEdges();
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	async function refreshEdges() {
		try {
			[outgoing, incoming] = await Promise.all([api.outgoingEdges(id), api.incomingEdges(id)]);
		} catch (e) {
			setError(e);
		}
	}

	async function save() {
		if (!node) return;
		saving = true;
		error = null;
		try {
			const payload = parseJsonObject(payloadText, 'Payload');
			node = await api.updateNode(id, { payload });
			payloadText = JSON.stringify(node.payload ?? {}, null, 2);
		} catch (e) {
			setError(e);
		} finally {
			saving = false;
		}
	}

	async function removeNode() {
		if (!confirm(`Delete node ${id}?`)) return;
		deleting = true;
		error = null;
		try {
			await api.deleteNode(id);
			window.location.href = '/nodes';
		} catch (e) {
			setError(e);
		} finally {
			deleting = false;
		}
	}

	async function createLink() {
		linking = true;
		error = null;
		try {
			if (!toId.trim()) throw new Error('to_id is required');
			if (!relation.trim()) throw new Error('relation is required');
			await api.createEdge({ from_id: id, to_id: toId.trim() as UUID, relation: relation.trim() });
			toId = '';
			relation = '';
			await refreshEdges();
		} catch (e) {
			setError(e);
		} finally {
			linking = false;
		}
	}

	async function deleteEdge(edge: EdgeOut) {
		if (!confirm(`Delete edge ${edge.from_id} -> ${edge.to_id} (${edge.relation})?`)) return;
		loading = true;
		error = null;
		try {
			await api.deleteEdge(edge.from_id, edge.to_id, edge.relation);
			await refreshEdges();
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	async function searchNodes() {
		searching = true;
		error = null;
		try {
			const query = parseJsonObject(searchQueryText, 'Query');
			searchResults = await api.searchNodes({
				kinds: parseKinds(searchKindsText),
				query,
				limit: 20
			});
		} catch (e) {
			setError(e);
		} finally {
			searching = false;
		}
	}

	function pickTarget(n: NodeOut) {
		toId = n.id;
	}

	$effect(() => {
		if (!id) return;
		void refresh();
	});
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Node</h1>
			<p class="mt-1 font-mono text-sm text-slate-600">{id}</p>
		</div>
		<div class="flex items-center gap-2">
			<a
				href="/nodes"
				class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
			>
				Back
			</a>
			<button
				onclick={refresh}
				class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
				disabled={loading}
			>
				Refresh
			</button>
			<button
				onclick={removeNode}
				class="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100 disabled:opacity-50"
				disabled={deleting}
			>
				{deleting ? 'Deleting…' : 'Delete'}
			</button>
		</div>
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
		<section class="space-y-6 lg:col-span-3">
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-sm font-semibold">Details</h2>
					{#if node}
						<div class="text-xs text-slate-600">
							Kind: <span class="font-medium text-slate-900">{node.kind}</span>
						</div>
					{/if}
				</div>
				<div class="mt-4">
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Payload (JSON object)</span>
						<textarea
							bind:value={payloadText}
							rows={14}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none focus:border-slate-400"
							spellcheck="false"
						></textarea>
					</label>
					<div class="mt-3">
						<button
							onclick={save}
							class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
							disabled={saving}
						>
							{saving ? 'Saving…' : 'Save'}
						</button>
					</div>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 class="text-sm font-semibold">Create link (edge)</h2>
				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<label class="block sm:col-span-2">
						<span class="text-xs font-medium text-slate-700">To node id</span>
						<input
							bind:value={toId}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="uuid"
						/>
					</label>
					<label class="block sm:col-span-2">
						<span class="text-xs font-medium text-slate-700">Relation</span>
						<input
							bind:value={relation}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. knows"
						/>
					</label>
				</div>
				<div class="mt-3">
					<button
						onclick={createLink}
						class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
						disabled={linking}
					>
						{linking ? 'Creating…' : 'Create link'}
					</button>
				</div>
			</div>
		</section>

		<section class="space-y-6 lg:col-span-3">
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 class="text-sm font-semibold">Find target node</h2>
				<p class="mt-1 text-xs text-slate-600">Use search results to fill “To node id”.</p>
				<div class="mt-4 space-y-3">
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Kinds (comma separated)</span>
						<input
							bind:value={searchKindsText}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. Person"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Query (JSON object)</span>
						<textarea
							bind:value={searchQueryText}
							rows={7}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none focus:border-slate-400"
							spellcheck="false"
						></textarea>
					</label>
					<button
						onclick={searchNodes}
						class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
						disabled={searching}
					>
						{searching ? 'Searching…' : 'Search'}
					</button>
				</div>

				<div class="mt-4 overflow-hidden rounded-xl border border-slate-200">
					<table class="min-w-full divide-y divide-slate-200 text-sm">
						<thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
							<tr>
								<th class="px-4 py-2">ID</th>
								<th class="px-4 py-2">Kind</th>
								<th class="px-4 py-2">Pick</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200">
							{#if searchResults.length === 0}
								<tr><td colspan="3" class="px-4 py-3 text-xs text-slate-500">No results.</td></tr>
							{:else}
								{#each searchResults as r (r.id)}
									<tr class="hover:bg-slate-50">
										<td class="px-4 py-2 font-mono text-xs text-slate-700">{r.id}</td>
										<td class="px-4 py-2">{r.kind}</td>
										<td class="px-4 py-2">
											<button
												onclick={() => pickTarget(r)}
												class="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
											>
												Use
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div class="border-b border-slate-200 px-5 py-4">
					<h2 class="text-sm font-semibold">Outgoing edges</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200 text-sm">
						<thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
							<tr>
								<th class="px-5 py-3">To</th>
								<th class="px-5 py-3">Relation</th>
								<th class="px-5 py-3">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200">
							{#if outgoing.length === 0}
								<tr><td colspan="3" class="px-5 py-4 text-slate-500">No outgoing edges.</td></tr>
							{:else}
								{#each outgoing as e (e.from_id + '|' + e.to_id + '|' + e.relation)}
									<tr class="hover:bg-slate-50">
										<td class="px-5 py-4 font-mono text-xs text-slate-700">{e.to_id}</td>
										<td class="px-5 py-4">{e.relation}</td>
										<td class="px-5 py-4">
											<button
												onclick={() => deleteEdge(e)}
												class="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
											>
												Delete
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div class="border-b border-slate-200 px-5 py-4">
					<h2 class="text-sm font-semibold">Incoming edges</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200 text-sm">
						<thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
							<tr>
								<th class="px-5 py-3">From</th>
								<th class="px-5 py-3">Relation</th>
								<th class="px-5 py-3">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200">
							{#if incoming.length === 0}
								<tr><td colspan="3" class="px-5 py-4 text-slate-500">No incoming edges.</td></tr>
							{:else}
								{#each incoming as e (e.from_id + '|' + e.to_id + '|' + e.relation)}
									<tr class="hover:bg-slate-50">
										<td class="px-5 py-4 font-mono text-xs text-slate-700">{e.from_id}</td>
										<td class="px-5 py-4">{e.relation}</td>
										<td class="px-5 py-4">
											<button
												onclick={() => deleteEdge(e)}
												class="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
											>
												Delete
											</button>
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
