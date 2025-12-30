# Team Sync Instructions

## How to Stay in Sync with the Main Branch

To ensure everyone is working with the latest code and avoid merge conflicts, follow these steps:

### Daily Workflow (Before Starting Work)

1. **Pull the latest changes:**
   ```bash
   git pull origin main
   ```

2. **If you have local changes, rebase instead:**
   ```bash
   git pull --rebase origin main
   ```
   This will apply your local commits on top of the latest main branch.

### If You Have Uncommitted Changes

1. **Stash your changes first:**
   ```bash
   git stash
   ```

2. **Pull the latest changes:**
   ```bash
   git pull origin main
   ```

3. **Restore your changes:**
   ```bash
   git stash pop
   ```

### If You Have Conflicts During Rebase

1. **Resolve conflicts in the files marked:**
   - Look for `<<<<<<<`, `=======`, and `>>>>>>>` markers
   - Edit the files to resolve conflicts
   - Remove the conflict markers

2. **Continue the rebase:**
   ```bash
   git add .
   git rebase --continue
   ```

3. **If you want to abort the rebase:**
   ```bash
   git rebase --abort
   ```

### Best Practices

- **Always pull before starting new work** to get the latest changes
- **Commit frequently** with clear messages
- **Pull before pushing** to avoid conflicts
- **Use `git pull --rebase`** instead of `git pull` to keep a cleaner history

### Quick Sync Command

```bash
# One-liner to sync with main
git pull --rebase origin main
```

---

**Note:** If you encounter any issues, contact the team leader before force pushing or doing anything that might affect the main branch.

