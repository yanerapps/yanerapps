<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteFlow, Position, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import ProviderNode from './ProviderNode.svelte';
  import FlowEdge from './FlowEdge.svelte';

  let {
    wrapperSelector = '[data-setup-flow]',
    nodeSelector = '[data-setup-node]',
  }: { wrapperSelector?: string; nodeSelector?: string } = $props();
  let root: HTMLDivElement;
  let nodes: Node[] = $state.raw([]);
  let direction: 'vertical' | 'horizontal' = $state('horizontal');
  const nodeTypes = { provider: ProviderNode };
  const edgeTypes = { flow: FlowEdge };
  let edges: Edge[] = $state.raw([]);

  onMount(() => {
    const wrapper = root.closest<HTMLElement>(wrapperSelector);
    const cards = [...(wrapper?.querySelectorAll<HTMLElement>(nodeSelector) ?? [])];
    if (!wrapper || cards.length < 2) return;
    edges = cards.slice(1).map((_, i) => ({
      id: `step-${i}`, source: `step-${i}`, target: `step-${i + 1}`, type: 'flow',
    }));
    const update = () => {
      const frame = wrapper.getBoundingClientRect();
      if (!frame.width || !frame.height) return;
      const next = matchMedia('(max-width: 860px)').matches ? 'vertical' : 'horizontal';
      direction = next;
      nodes = cards.map((card, i) => {
        const box = card.getBoundingClientRect();
        return {
          id: `step-${i}`,
          type: 'provider',
          position: {
            x: box.left - frame.left + box.width / 2,
            y: box.top - frame.top + box.height / 2,
          },
          width: 1,
          height: 1,
          sourcePosition: next === 'vertical' ? Position.Bottom : Position.Right,
          targetPosition: next === 'vertical' ? Position.Top : Position.Left,
          data: { kind: 'junction', direction: next },
        };
      });
    };
    const observer = new ResizeObserver(update);
    [wrapper, ...cards].forEach((card) => observer.observe(card));
    update();
    return () => observer.disconnect();
  });
</script>

<div class="canvas" bind:this={root} aria-hidden="true" inert>
  {#key direction}
    <SvelteFlow
      bind:nodes
      {edges}
      {nodeTypes}
      {edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
    />
  {/key}
</div>

<style>
  .canvas {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .canvas :global(.svelte-flow__edges svg) {
    max-width: none;
  }
  .canvas :global(.svelte-flow__attribution) {
    display: none;
  }
</style>
