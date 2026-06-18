---
description: A frontend data layer for a Tauri v2 app — caching command results with RTK Query over a custom Tauri base query, tag invalidation, and in-place streaming updates
---

# Frontend Data Layer (Tauri v2 + React)

Treat Tauri commands as a remote API and cache them with a query library. This
guide uses **Redux Toolkit + RTK Query** over a custom base query that calls the
typed invoke wrapper. (The same idea applies with TanStack Query or similar —
wrap `invokeCommand` as the fetcher.) Examples:
[assets/frontend/base_api.ts](../assets/frontend/base_api.ts),
[assets/frontend/feature_api.ts](../assets/frontend/feature_api.ts),
[assets/frontend/tauri.ts](../assets/frontend/tauri.ts).

## The store

Configure a single store: the query reducer plus per-feature slices for pure
UI/local state (ui, notifications, …). Guideline: backend data → the query cache;
ephemeral UI state → a slice. Don't put backend entities in plain slices.

## A custom base query bridging to Tauri

Turn each query request into an `invokeCommand`, and map a thrown `AppError`
string into the error shape via `parseBackendError`:

```typescript
const tauriBaseQuery: BaseQueryFn<
  { command: TauriCommand; args?: Record<string, unknown> },
  unknown,
  { message: string; category?: string }
> = async ({ command, args }) => {
  try {
    return { data: await invokeCommand(command, args) };
  } catch (error) {
    const { category, message } = parseBackendError(error); // [Category] message
    return { error: { message, category } };
  }
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: tauriBaseQuery,
  tagTypes: ['Workspace', 'Chat', 'Message' /* ... */],
  endpoints: () => ({}),
});
```

Error categories flow from here to the UI — see
[tauri-error-handling.md](tauri-error-handling.md).

## Endpoints: inject per feature, wire tags

Add each feature's endpoints with `baseApi.injectEndpoints(...)`. The `query`
returns `{ command, args }`. Cache coherence is driven by **tags**: queries
`providesTags`, mutations `invalidatesTags`.

```typescript
export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChats: builder.query<Chat[], string>({
      query: (workspaceId) => ({
        command: TauriCommands.GET_CHATS,
        args: { workspaceId },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chat' as const, id })),
              { type: 'Chat', id: 'LIST' },
            ]
          : [{ type: 'Chat', id: 'LIST' }],
    }),
    createChat: builder.mutation<Chat, NewChat>({
      query: (chat) => ({ command: TauriCommands.CREATE_CHAT, args: chat }),
      invalidatesTags: [{ type: 'Chat', id: 'LIST' }], // refetch the list after create
    }),
  }),
});
```

Conventions:

- Use `transformResponse` to map the wire/DB shape to the frontend type.
- New entity type → add it to `tagTypes`.
- Components consume the generated hooks (`useGetChatsQuery`,
  `useCreateChatMutation`) and read `isLoading` / `error` from them rather than
  hand-managing loading state.

## Streaming updates bypass refetch

For push-based updates, mutate the cached query data **in place** with
`api.util.updateQueryData` instead of invalidating + refetching — e.g. append a
streamed token to the cached message. This is the high-value pattern; see
[tauri-events-and-emitters.md](tauri-events-and-emitters.md).

## Suggested folder layout

```
src/
├── app/            # store, base query, hooks, middleware
├── bindings/       # generated command/event name constants (do not hand-edit)
├── features/<x>/   # state/ (slices + api), hooks/, ui/, lib/, types
├── hooks/          # cross-feature hooks (event listeners, menu)
├── lib/            # invoke/listen wrapper, utils (parseBackendError)
└── ui/             # shared components (e.g. Atomic Design)
```

Feature-scoped UI lives in `features/<x>/ui/`; only cross-feature primitives go in
the top-level `ui/`.

## Checklist for new frontend data access

- [ ] Backend data goes through a query/mutation endpoint (not a raw
      `invokeCommand`, unless it's a one-off non-cached call)
- [ ] `query` returns `{ command: TauriCommands.X, args }`
- [ ] Query sets `providesTags`; mutation sets `invalidatesTags`
- [ ] New entity type added to `tagTypes`
- [ ] Wire/DB shape mapped with `transformResponse`
- [ ] Component uses generated hooks + their `isLoading`/`error`
