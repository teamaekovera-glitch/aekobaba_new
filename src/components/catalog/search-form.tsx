// Hero search form — a plain GET form to /results; no client JS.

export function SearchForm({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <form action="/results" role="search" className="w-full">
      <label htmlFor={size === "lg" ? "hero-search" : "small-search"} className="sr-only">
        What are you packaging?
      </label>
      <div
        className={`flex overflow-hidden rounded-lg bg-white shadow-md ${
          size === "lg" ? "ring-1 ring-neutral-200" : "ring-1 ring-neutral-200"
        }`}
      >
        <input
          id={size === "lg" ? "hero-search" : "small-search"}
          type="search"
          name="q"
          placeholder="What are you packaging? Try “pouches”, “bottles”, “labels”…"
          className={`w-full text-ink placeholder:text-neutral-400 focus:outline-none ${
            size === "lg" ? "px-4 py-3 text-base" : "px-3 py-2 text-sm"
          }`}
        />
        <button
          type="submit"
          className={`bg-accent px-5 font-medium text-white transition-colors hover:bg-accent-dark ${
            size === "lg" ? "text-sm" : "text-xs"
          }`}
        >
          Find packaging
        </button>
      </div>
    </form>
  );
}
