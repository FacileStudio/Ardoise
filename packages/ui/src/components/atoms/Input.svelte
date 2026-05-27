<script lang="ts">
    export let value: string | number = "";
    export let placeholder = "";
    export let type: "text" | "email" | "password" | "number" | "tel" | "url" | "date" = "text";
    export let error = false;
    export let id = "";
    export let name = "";

    let className = "";
    export { className as class };
</script>

<input
    {id}
    {name}
    {type}
    {placeholder}
    bind:value
    class="h-9 w-full rounded-lg border bg-transparent px-3 text-sm transition-colors outline-none
    focus:ring-2 focus:ring-ring/50
    {error ? 'border-danger focus:border-danger' : 'border-input focus:border-foreground'}
    {className}"
    {...$$restProps}
    on:input
    on:blur
    on:keydown
/>
