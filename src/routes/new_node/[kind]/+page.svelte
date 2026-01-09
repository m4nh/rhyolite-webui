<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createForm, BasicForm, type Schema } from '@sjsf/form';
	import { resolver } from '@sjsf/form/resolvers/basic';
	import { translation } from '@sjsf/form/translations/en';
	import { createFormMerger } from '@sjsf/form/mergers/modern';
	import { createFormIdBuilder } from '@sjsf/form/id-builders/modern';
	import { createFormValidator } from '@sjsf/ajv8-validator';
	import { theme } from '@sjsf/basic-theme';
	import '@sjsf/basic-theme/css/basic.css';
	import { RhyoliteApi } from '$lib/RhyoliteApi';
	import type { KindOut } from '$lib/model';
	import { describeError, type UiError } from '$lib/errors';
	import { page } from '$app/state';

	const api = RhyoliteApi.getInstance();

	let kind: string = $state('');
	let schema: Schema | null = $state(null);
	let loading = $state(true);
	let creating = $state(false);
	let error: UiError | null = $state(null);
	let form: ReturnType<typeof createForm> | null = $state(null);

	$effect(() => {
		kind = page.params.kind ?? '';
		if (kind && !schema) {
			loadSchema();
		}
	});

	function setError(e: unknown) {
		error = describeError(e);
	}

	async function loadSchema() {
		if (!kind) return;
		loading = true;
		error = null;
		try {
			const kindData: KindOut = await api.getKind(kind);
			schema = kindData.schema as Schema;
			form = createForm({
				theme,
				schema,
				resolver,
				translation,
				merger: createFormMerger,
				validator: createFormValidator,
				idBuilder: createFormIdBuilder,
				onSubmit: handleSubmit
			});
		} catch (e) {
			setError(e);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(data: unknown) {
		creating = true;
		error = null;
		try {
			await api.createNode({ kind, payload: data as Record<string, unknown> });
			goto('/nodes');
		} catch (e) {
			setError(e);
		} finally {
			creating = false;
		}
	}

	onMount(() => {
		if (kind) loadSchema();
	});
</script>

<div class="mx-auto max-w-4xl space-y-6">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">Create New {kind} Node</h1>
		<p class="mt-1 text-sm text-slate-600">Fill in the form to create a new node of kind {kind}.</p>
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

	{#if loading}
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<p class="text-sm text-slate-600">Loading schema for {kind}...</p>
		</div>
	{:else if form}
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<BasicForm {form} />
		</div>
	{/if}
</div>
