<script lang="ts">
	import { onMount } from 'svelte';
	import { RhyoliteApi } from '$lib/RhyoliteApi';
	import type { EdgesKindOut } from '$lib/model';
	import { describeError, type UiError } from '$lib/errors';

	const api = RhyoliteApi.getInstance();

	let items: EdgesKindOut[] = $state([]);
	let loading = $state(false);
	let saving = $state(false);
	let error: UiError | null = $state(null);

	let mode: 'create' | 'edit' = $state('create');
	let originalKey: { from_kind: string; to_kind: string; relation: string } | null = $state(null);

	let from_kind = $state('');
	let to_kind = $state('');
	let relation = $state('');

	function setError(e: unknown) {
		error = describeError(e);
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			items = await api.listEdgesKinds();
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		mode = 'create';
		originalKey = null;
		from_kind = '';
		to_kind = '';
		relation = '';
	}

	function startEdit(edge: EdgesKindOut) {
		mode = 'edit';
		originalKey = { ...edge };
		from_kind = edge.from_kind;
		to_kind = edge.to_kind;
		relation = edge.relation;
	}

	async function submit() {
		saving = true;
		error = null;
		try {
			if (!from_kind.trim() || !to_kind.trim() || !relation.trim()) {
				throw new Error('from_kind, to_kind, and relation are required');
			}

			if (mode === 'edit' && originalKey) {
				// No update endpoint: emulate via delete+create.
				await api.deleteEdgesKind(originalKey.from_kind, originalKey.to_kind, originalKey.relation);
			}

			await api.createEdgesKind({
				from_kind: from_kind.trim(),
				to_kind: to_kind.trim(),
				relation: relation.trim()
			});
			await refresh();
			resetForm();
		} catch (e) {
			setError(e);
		} finally {
			saving = false;
		}
	}

	async function remove(edge: EdgesKindOut) {
		if (!confirm(`Delete edge kind ${edge.from_kind} -> ${edge.to_kind} (${edge.relation})?`))
			return;
		loading = true;
		error = null;
		try {
			await api.deleteEdgesKind(edge.from_kind, edge.to_kind, edge.relation);
			await refresh();
			if (
				mode === 'edit' &&
				originalKey &&
				originalKey.from_kind === edge.from_kind &&
				originalKey.to_kind === edge.to_kind &&
				originalKey.relation === edge.relation
			) {
				resetForm();
			}
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	onMount(refresh);
</script>

<div class="mx-auto max-w-5xl space-y-6">
	<div class="flex items-end justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Edges</h1>
			<p class="mt-1 text-sm text-slate-600">
				Manage edges kinds (allowed relations between kinds).
			</p>
		</div>
		<button
			onclick={refresh}
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

	<div class="grid gap-6 lg:grid-cols-5">
		<section class="lg:col-span-2">
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-sm font-semibold">
						{mode === 'create' ? 'Create edges kind' : 'Edit edges kind'}
					</h2>
					{#if mode === 'edit'}
						<button
							onclick={resetForm}
							class="text-xs font-medium text-slate-600 hover:text-slate-900"
						>
							Cancel
						</button>
					{/if}
				</div>

				<div class="mt-4 space-y-3">
					<label class="block">
						<span class="text-xs font-medium text-slate-700">From kind</span>
						<input
							bind:value={from_kind}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. Person"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-700">To kind</span>
						<input
							bind:value={to_kind}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. Company"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Relation</span>
						<input
							bind:value={relation}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. works_at"
						/>
					</label>

					<div class="flex items-center gap-2">
						<button
							onclick={submit}
							class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
							disabled={saving}
						>
							{saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
						</button>
						<div class="text-xs text-slate-500">
							{#if mode === 'edit'}Edits are applied as delete + create (no update endpoint).{/if}
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="lg:col-span-3">
			<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div class="border-b border-slate-200 px-5 py-4">
					<h2 class="text-sm font-semibold">Existing edges kinds</h2>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200 text-sm">
						<thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
							<tr>
								<th class="px-5 py-3">From</th>
								<th class="px-5 py-3">To</th>
								<th class="px-5 py-3">Relation</th>
								<th class="px-5 py-3">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200">
							{#if loading}
								<tr><td class="px-5 py-4 text-slate-500" colspan="4">Loading…</td></tr>
							{:else if items.length === 0}
								<tr><td class="px-5 py-4 text-slate-500" colspan="4">No edges kinds yet.</td></tr>
							{:else}
								{#each items as e (e.from_kind + '|' + e.to_kind + '|' + e.relation)}
									<tr class="hover:bg-slate-50">
										<td class="px-5 py-4 font-medium text-slate-900">{e.from_kind}</td>
										<td class="px-5 py-4">{e.to_kind}</td>
										<td class="px-5 py-4">{e.relation}</td>
										<td class="px-5 py-4">
											<div class="flex items-center gap-2">
												<button
													onclick={() => startEdit(e)}
													class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
												>
													Edit
												</button>
												<button
													onclick={() => remove(e)}
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
