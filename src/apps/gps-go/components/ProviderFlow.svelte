<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteFlow, Position, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import ProviderNode from './ProviderNode.svelte';
  import FlowEdge from './FlowEdge.svelte';
  import { at } from '../../../lib/at';
  import { providerJunctions } from '../scripts/provider-layout';

  type Sink = { name: string; detail: string; short: string };
  let {
    sinks,
    sourceDetail,
    targetDetail,
  }: { sinks: Sink[]; sourceDetail: string; targetDetail: string } = $props();
  let root: HTMLDivElement;
  let nodes: Node[] = $state.raw([]);
  let direction: 'vertical' | 'horizontal' = $state('horizontal');
  const nodeTypes = { provider: ProviderNode };
  const edgeTypes = { flow: FlowEdge };
  let edges: Edge[] = $derived([
    { id: 'source-fork', source: 'source', target: 'fork', type: 'flow' },
    ...sinks.map((_, i) => ({
      id: `fork-${i}`,
      source: 'fork',
      target: `provider-${i}`,
      type: 'flow',
    })),
    ...sinks.map((_, i) => ({
      id: `${i}-merge`,
      source: `provider-${i}`,
      target: 'merge',
      type: 'flow',
    })),
    { id: 'merge-target', source: 'merge', target: 'target', type: 'flow' },
  ]);

  onMount(() => {
    const wrapper = root.closest<HTMLElement>('[data-flow-wrapper]');
    const fallback = wrapper?.querySelector<HTMLElement>('[data-provider-flow]');
    const source = fallback?.querySelector<HTMLElement>('[data-flow-source]');
    const target = fallback?.querySelector<HTMLElement>('[data-flow-target]');
    const providers = [...(fallback?.querySelectorAll<HTMLElement>('[data-flow-provider]') ?? [])];
    if (!wrapper || !fallback || !source || !target || providers.length !== sinks.length) return;

    const update = () => {
      const frame = fallback.getBoundingClientRect();
      if (!frame.width || !frame.height) return;
      const vertical = matchMedia('(max-width: 860px)').matches;
      const nextDirection = vertical ? 'vertical' : 'horizontal';
      if (direction !== nextDirection) {
        wrapper.removeAttribute('data-flow-ready');
        direction = nextDirection;
      }
      const rect = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - frame.left, y: r.top - frame.top, width: r.width, height: r.height };
      };
      const start = rect(source);
      const end = rect(target);
      const positions = providers.map(rect);
      const { fork, merge } = providerJunctions(start, end, positions, vertical);
      const item = (
        id: string,
        box: typeof start,
        kind: string,
        title = '',
        detail = '',
      ): Node => ({
        id,
        type: 'provider',
        sourcePosition: vertical ? Position.Bottom : Position.Right,
        targetPosition: vertical ? Position.Top : Position.Left,
        position: { x: box.x, y: box.y },
        width: box.width,
        height: box.height,
        data: { kind, title, detail, direction: nextDirection },
      });
      nodes = [
        item('source', start, 'source', 'GPS-Go', sourceDetail),
        ...positions.map((box, i) =>
          item(
            `provider-${i}`,
            box,
            'provider',
            at(sinks, i).name,
            vertical ? at(sinks, i).short : at(sinks, i).detail,
          ),
        ),
        item('target', end, 'target', 'Your apps', targetDetail),
        item('fork', { ...fork, width: 1, height: 1 }, 'junction'),
        item('merge', { ...merge, width: 1, height: 1 }, 'junction'),
      ];
    };
    const ready = () => {
      if (root.querySelectorAll('[data-flow-base]').length === edges.length)
        wrapper.setAttribute('data-flow-ready', '');
    };
    const mutations = new MutationObserver(ready);
    mutations.observe(root, { subtree: true, childList: true });
    const observer = new ResizeObserver(update);
    [fallback, source, target, ...providers].forEach((el) => observer.observe(el));
    update();
    return () => {
      observer.disconnect();
      mutations.disconnect();
      wrapper.removeAttribute('data-flow-ready');
    };
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
  .canvas :global(.svelte-flow__edges svg) {
    max-width: none;
  }

  .canvas :global(.svelte-flow__attribution) {
    display: none;
  }

  .canvas {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
