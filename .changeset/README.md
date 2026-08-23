# Changesets

This folder contains release notes for SearchSuite. Add a changeset for every
user-visible package change:

```sh
pnpm changeset
```

After a change reaches `main`, GitHub Actions creates or updates a Version
Packages pull request. Merging that pull request publishes the package through
npm Trusted Publishing.
