<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type * as L from 'leaflet';
  import 'leaflet/dist/leaflet.css';

  export let lat = 48.8566;
  export let lon = 2.3522;
  export let zoom = 13;
  export let height = '400px';
  export let markers: Array<{ lat: number; lon: number; label?: string }> = [];

  let mapElement: HTMLDivElement;
  let map: L.Map | null = null;
  let LeafletLib: typeof L | null = null;
  let markerLayers: L.Marker[] = [];

  async function initMap() {
    const leaflet = await import('leaflet');
    LeafletLib = leaflet.default;

    // @ts-expect-error - Leaflet requires deleting _getIconUrl to use custom icons
    delete LeafletLib.Icon.Default.prototype._getIconUrl;
    LeafletLib.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    map = LeafletLib.map(mapElement).setView([lat, lon], zoom);

    LeafletLib.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap',
    }).addTo(map);

    updateMarkers();
  }

  function updateMarkers() {
    if (!map || !LeafletLib) return;
    markerLayers.forEach((m) => m.remove());
    markerLayers = [];

    markers.forEach((p) => {
      const m = LeafletLib!.marker([p.lat, p.lon]).addTo(map!);
      if (p.label) m.bindPopup(p.label);
      markerLayers.push(m);
    });
  }

  onMount(() => {
    if (browser) {
      initMap();
    }
  });

  onDestroy(() => {
    if (map) map.remove();
  });

  $: if (map && LeafletLib) {
    markers;
    updateMarkers();
    map.setView([lat, lon], zoom);
  }
</script>

<div
  bind:this={mapElement}
  class="w-full rounded overflow-hidden border border-slate-100 bg-slate-50"
  style="height: {height};"
>
  {#if !map}
    <div class="flex h-full w-full items-center justify-center text-slate-400">
      Chargement de la carte...
    </div>
  {/if}
</div>
