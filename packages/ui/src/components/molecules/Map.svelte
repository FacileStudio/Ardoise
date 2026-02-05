<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  // On n'importe PAS Leaflet ici !
  import 'leaflet/dist/leaflet.css';

  export let lat = 48.8566;
  export let lon = 2.3522;
  export let zoom = 13;
  export let height = '400px';
  export let markers: Array<{ lat: number; lon: number; label?: string }> = [];

  let mapElement: HTMLDivElement;
  let map: any; // On utilise any ou le type L.Map si tu importes juste le type
  let L: any;
  let markerLayers: any[] = [];

  async function initMap() {
    // Import dynamique : s'exécute seulement côté client
    const leaflet = await import('leaflet');
    L = leaflet.default;

    // Fix des icônes
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    map = L.map(mapElement).setView([lat, lon], zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap',
    }).addTo(map);

    updateMarkers();
  }

  function updateMarkers() {
    if (!map || !L) return;
    markerLayers.forEach((m) => m.remove());
    markerLayers = [];

    markers.forEach((p) => {
      const m = L.marker([p.lat, p.lon]).addTo(map);
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

  $: if (map && L) {
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
