<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteFlow, Position, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import ProviderNode from './ProviderNode.svelte';
  import FlowEdge from './FlowEdge.svelte';

  let root: HTMLDivElement;
  let nodes: Node[] = $state.raw([]);
  let direction: 'vertical' | 'horizontal' = $state('horizontal');
  const nodeTypes = { provider: ProviderNode };
  const edgeTypes = { flow: FlowEdge };
  const edges: Edge[] = [0, 1, 2].map((i) => ({
    id: `step-${i}`,
    source: `step-${i}`,
    target: `step-${i + 1}`,
    type: 'flow',
  }));

  onMount(() => {
    const wrapper = root.closest<HTMLElement>('[data-setup-flow]');
    const cards = [...(wrapper?.querySelectorAll<HTMLElement>('[data-setup-node]') ?? [])];
    if (!wrapper || cards.length !== 4) return;
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
