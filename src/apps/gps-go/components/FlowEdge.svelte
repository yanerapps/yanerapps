<script lang="ts">
  import { getBezierPath, type EdgeProps } from '@xyflow/svelte';

  let { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps = $props();
  let [path] = $derived(
    getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    }),
  );
</script>

<path d={path} class="flow-base" data-flow-base />
<path d={path} class="flow-pulse" data-flow-pulse />

<style>
  path {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .flow-base {
    stroke: color-mix(in oklab, var(--accent) 26%, var(--muted));
    stroke-opacity: 0.65;
    stroke-width: 2;
  }

  .flow-pulse {
    stroke: var(--accent);
    stroke-width: 3;
    stroke-dasharray: 8 48;
    animation: flow-pulse 2.4s linear infinite;
  }

  @keyframes flow-pulse {
    to {
      stroke-dashoffset: -56;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flow-pulse {
      display: none;
    }
  }
</style>
