<script lang="ts">
    export let value: string | number = "";
    export let placeholder = "";
    export let type: "text" | "email" | "password" | "number" | "tel" | "url" = "text";
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
    class="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 transition-all font-bold text-slate-700 outline-none
    {error ? 'border-rose-200 focus:border-rose-500' : 'border-transparent focus:border-indigo-500'}
    {className}"
    {...$$restProps}
    on:input
    on:blur
    on:keydown
/>
