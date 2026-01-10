<script lang="ts">
	import type { HealthStatus } from '$lib/model';
	import { RhyoliteApi } from '$lib/RhyoliteApi';
	import { onMount } from 'svelte';

	let status: HealthStatus | null = $state(null);
	const api = RhyoliteApi.getInstance();

	async function update() {
		status = await api.healty();
	}
	onMount(() => {
		update();
	});
</script>

<div class="p-4">
	{#if status}
		<div class="mx-auto max-w-md">
			<h2 class="mb-4 text-xl font-bold">System Health Status</h2>

			<div class="space-y-2">
				<div>
					<span class="font-medium">Status:</span>
					<span>{status.ok ? 'OK' : 'Not OK'}</span>
				</div>

				<div>
					<span class="font-medium">Database Schema:</span>
					<span>{status.db_schema_ready ? 'Ready' : 'Not Ready'}</span>
				</div>

				<div>
					<span class="font-medium">Allowed Origins:</span>
					<span>{status.allowed_origins.join(', ')}</span>
				</div>

				<div>
					<span class="font-medium">Time:</span>
					<span>{status.time}</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="text-center">
			<p>Loading...</p>
		</div>
	{/if}
</div>
