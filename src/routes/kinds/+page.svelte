<script lang="ts">
	import { onMount } from 'svelte';
	import { RhyoliteApi } from '$lib/RhyoliteApi';
	import type { KindOut } from '$lib/model';
	import { describeError, type UiError } from '$lib/errors';

	const api = RhyoliteApi.getInstance();

	let kinds: KindOut[] = $state([]);
	let loading = $state(false);
	let saving = $state(false);
	let error: UiError | null = $state(null);

	let mode: 'create' | 'edit' = $state('create');
	let originalName: string | null = $state(null);

	let name = $state('');
	let schemaText = $state('{\n  \n}');
	let showTip = $state(false);

	function setError(e: unknown) {
		error = describeError(e);
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			kinds = await api.listKinds();
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		mode = 'create';
		originalName = null;
		name = '';
		schemaText = '{\n  \n}';
	}

	function startEdit(kind: KindOut) {
		mode = 'edit';
		originalName = kind.name;
		name = kind.name;
		schemaText = JSON.stringify(kind.schema ?? {}, null, 2);
	}

	function parseSchema(): Record<string, unknown> {
		const v = schemaText.trim();
		if (!v) return {};
		const parsed = JSON.parse(v) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('Schema must be a JSON object');
		}
		return parsed as Record<string, unknown>;
	}

	async function submit() {
		saving = true;
		error = null;
		try {
			const schema = parseSchema();
			if (!name.trim()) throw new Error('Name is required');

			if (mode === 'edit' && originalName && originalName !== name.trim()) {
				// No update endpoint in OpenAPI: emulate rename via delete+create.
				await api.deleteKind(originalName);
			}
			if (mode === 'edit' && originalName && originalName === name.trim()) {
				// Emulate update via delete+create.
				await api.deleteKind(originalName);
			}

			await api.createKind({ name: name.trim(), schema });
			await refresh();
			resetForm();
		} catch (e) {
			setError(e);
		} finally {
			saving = false;
		}
	}

	async function remove(kind: KindOut) {
		if (!confirm(`Delete kind "${kind.name}"?`)) return;
		loading = true;
		error = null;
		try {
			await api.deleteKind(kind.name);
			await refresh();
			if (mode === 'edit' && originalName === kind.name) resetForm();
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
			<h1 class="text-xl font-semibold tracking-tight">Kinds</h1>
			<p class="mt-1 text-sm text-slate-600">Create, edit, and delete kinds.</p>
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
					<div class="flex items-center gap-2">
						<h2 class="text-sm font-semibold">{mode === 'create' ? 'Create kind' : 'Edit kind'}</h2>
						<button
							onclick={() => (showTip = !showTip)}
							class="text-sm text-slate-400 hover:text-slate-600"
							title="Show tip"
						>
							ℹ️
						</button>
					</div>
					{#if mode === 'edit'}
						<button
							onclick={resetForm}
							class="text-xs font-medium text-slate-600 hover:text-slate-900"
						>
							Cancel
						</button>
					{/if}
				</div>
				{#if showTip}
					<div class="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
						To create a sample schema, go to page: <a
							href="https://json.ophir.dev/"
							target="_blank"
							class="underline">https://json.ophir.dev/</a
						>
					</div>
				{/if}

				<div class="mt-4 space-y-3">
					<label class="block">
						<span class="text-xs font-medium text-slate-700">Name</span>
						<input
							bind:value={name}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
							placeholder="e.g. Person"
						/>
					</label>

					<label class="block">
						<span class="text-xs font-medium text-slate-700">Schema (JSON object)</span>
						<textarea
							bind:value={schemaText}
							rows={10}
							class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none focus:border-slate-400"
							spellcheck="false"
						></textarea>
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
					<h2 class="text-sm font-semibold">Existing kinds</h2>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200 text-sm">
						<thead class="bg-slate-50 text-left text-xs font-semibold text-slate-600">
							<tr>
								<th class="px-5 py-3">Name</th>
								<th class="px-5 py-3">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200">
							{#if loading}
								<tr><td class="px-5 py-4 text-slate-500" colspan="2">Loading…</td></tr>
							{:else if kinds.length === 0}
								<tr><td class="px-5 py-4 text-slate-500" colspan="2">No kinds yet.</td></tr>
							{:else}
								{#each kinds as kind (kind.name)}
									<tr class="hover:bg-slate-50">
										<td class="px-5 py-4 font-medium text-slate-900">{kind.name}</td>
										<td class="px-5 py-4">
											<div class="flex items-center gap-2">
												<a
													href="/new_node/{kind.name}"
													class="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
												>
													Create Node
												</a>
												<button
													onclick={() => startEdit(kind)}
													class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
												>
													Edit
												</button>
												<button
													onclick={() => remove(kind)}
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
