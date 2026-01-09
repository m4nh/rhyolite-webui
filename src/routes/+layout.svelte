<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setConfig, initGlobalConfig } from '$lib/config';
	import { page } from '$app/stores';

	let { children, data } = $props();

	let pathname = $derived($page.url.pathname);

	const isActive = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

	// Make config available via context and globally
	// svelte-ignore state_referenced_locally
	setConfig(data.config);
	// svelte-ignore state_referenced_locally
	initGlobalConfig(data.config);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900">
	<div class="mx-auto flex min-h-dvh max-w-7xl">
		<aside class="w-72 shrink-0 border-r border-slate-200/70 bg-white/70 px-4 py-6 backdrop-blur">
			<div class="mb-8 flex items-center gap-3">
				<div class="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
					<span class="text-sm font-semibold">R</span>
				</div>
				<div>
					<div class="text-sm font-semibold">Rhyolite</div>
					<div class="text-xs text-slate-500">Web UI</div>
				</div>
			</div>

			<nav class="space-y-1">
				<a
					href="/kinds"
					class={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
						isActive('/kinds') ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
					}`}
				>
					Kinds
				</a>
				<a
					href="/edges"
					class={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
						isActive('/edges') ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
					}`}
				>
					Edges
				</a>
				<a
					href="/nodes"
					class={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
						isActive('/nodes') ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
					}`}
				>
					Nodes
				</a>
			</nav>

			<div
				class="mt-8 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600"
			>
				<div class="font-medium text-slate-700">API</div>
				<div class="mt-1 break-all">{data.config.apiServiceUrl}</div>
			</div>
		</aside>

		<main class="flex-1 px-6 py-8">
			{@render children()}
		</main>
	</div>
</div>
