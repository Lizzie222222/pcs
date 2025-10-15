# Translation Guide

## 🌍 Overview

This application uses **react-i18next** for internationalization (i18n). All user-facing text must be translatable to support multiple languages.

## 📁 Translation File Locations

Translation files are organized by namespace in:
```
client/src/locales/{language}/{namespace}.json
```

### Available Languages
- `en/` - English (primary)
- `es/` - Spanish
- `fr/` - French
- `pt/` - Portuguese
- `ar/` - Arabic

### Translation Namespaces

| Namespace | File | Purpose |
|-----------|------|---------|
| `common` | `common.json` | Shared UI elements, navigation, buttons, status messages |
| `landing` | `landing.json` | Landing page content |
| `dashboard` | `dashboard.json` | School dashboard |
| `resources` | `resources.json` | Resource management |
| `forms` | `forms.json` | Form labels and validation |
| `auth` | `auth.json` | Authentication flows |
| `admin` | `admin.json` | Admin panel, case studies, analytics |
| `map` | `map.json` | Schools map page |
| `search` | `search.json` | Search functionality |
| `newsletter` | `newsletter.json` | Newsletter content |

## ✅ Mandatory Translation Checklist

### Before Writing Any Component:

- [ ] **NO hardcoded English strings** - All text must use `t()` function
- [ ] **Import useTranslation** - Add `import { useTranslation } from "react-i18next";`
- [ ] **Initialize hook** - Use `const { t } = useTranslation('namespace');`
- [ ] **Add translation keys** - Add missing keys to appropriate JSON file
- [ ] **Use descriptive key names** - Keys should be semantic, not literal text

### Key Naming Conventions:

```javascript
// ✅ GOOD - Semantic, hierarchical keys
t('buttons.save')
t('messages.error_occurred')
t('admin.case_study.add_metric')

// ❌ BAD - Literal text as keys
t('Save')
t('An error occurred')
t('Add Metric')
```

## 🔧 How to Add Translations

### Step 1: Identify the Namespace

Choose the appropriate namespace based on where the text appears:
- UI components → `common`
- Page-specific → Use page namespace
- Admin features → `admin`

### Step 2: Add Translation Keys

Edit the appropriate JSON file:

**Example: Adding error message to `common.json`**
```json
{
  "messages": {
    "error_occurred": "An error occurred",
    "try_again": "Try Again"
  }
}
```

**Example: Adding admin case study keys to `admin.json`**
```json
{
  "case_study": {
    "add_metric": "Add Metric",
    "metric_number": "Metric {{number}}"
  }
}
```

### Step 3: Use in Component

```tsx
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t } = useTranslation('common'); // or 'admin', etc.
  
  return (
    <div>
      <p>{t('messages.error_occurred')}</p>
      <button>{t('messages.try_again')}</button>
    </div>
  );
}
```

### Dynamic Values (Interpolation)

Use interpolation for dynamic content:

**Translation file:**
```json
{
  "welcome_user": "Welcome, {{name}}!",
  "items_count": "You have {{count}} items"
}
```

**Component:**
```tsx
<p>{t('welcome_user', { name: user.name })}</p>
<p>{t('items_count', { count: items.length })}</p>
```

## 📋 Common Patterns

### Error States
```tsx
import { ErrorState } from "@/components/ui/states";

// ErrorState now uses translations internally
<ErrorState 
  title={t('messages.something_went_wrong')}
  description={t('messages.error_occurred_loading')}
  onRetry={handleRetry}
/>

// Or use defaults (will use translated defaults)
<ErrorState onRetry={handleRetry} />
```

### Loading States
```tsx
import { LoadingSpinner } from "@/components/ui/states";

// LoadingSpinner uses translations internally
<LoadingSpinner message={t('status.loading')} />

// Or use default (will use t('status.loading'))
<LoadingSpinner />
```

### Empty States
```tsx
import { EmptyState } from "@/components/ui/states";

<EmptyState
  icon={FileText}
  title={t('messages.no_data_found')}
  description={t('admin.evidence.no_evidence_submitted')}
  action={{
    label: t('buttons.upload'),
    onClick: handleUpload
  }}
/>
```

## 🚨 Components Requiring Translation

### ✅ Already Translated (DO NOT change):
- ErrorState
- LoadingSpinner  
- EvidenceVideoLinks
- CategorisationSection
- ImpactMetricsBuilder
- TimelineBuilder
- EmptyState (uses props, no internal strings)
- RegistrationStepper (uses props, no internal strings)

### ⚠️ Need Translation Audit:
Check these components for hardcoded strings:
- MultiStepSchoolRegistration.tsx
- SchoolSignUpForm.tsx
- JoinSchoolFlow.tsx
- PlasticWasteAudit.tsx
- CertificateTemplate.tsx
- ShareDialog.tsx
- AssignTeacherForm.tsx
- PrintableFormsTab.tsx
- EvidenceGalleryTab.tsx
- EmailManagementSection.tsx

## 🔍 How to Find Hardcoded Strings

Use grep to search for hardcoded English strings:

```bash
# Find components with hardcoded text in JSX
grep -r ">[A-Z][a-z].*</" client/src/components

# Find placeholder text
grep -r 'placeholder="[^{]' client/src/components

# Find button labels
grep -r "<Button.*>[A-Z]" client/src/components
```

## 🎯 Translation Best Practices

### 1. **Never Mix Languages**
```tsx
// ❌ BAD - Mixing languages
<p>{t('hello')} User</p>

// ✅ GOOD - All translated
<p>{t('welcome_user')}</p>
```

### 2. **Use Semantic Keys**
```tsx
// ❌ BAD - Key matches English text
t('Click here to download')

// ✅ GOOD - Semantic key
t('buttons.download')
```

### 3. **Group Related Keys**
```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit"
  },
  "messages": {
    "success": "Success!",
    "error": "Error occurred"
  }
}
```

### 4. **Provide Context in Admin Namespace**
```json
{
  "admin": {
    "case_study": {
      "add_metric": "Add Metric",
      "metric_label": "Label"
    },
    "evidence": {
      "approve": "Approve",
      "reject": "Reject"
    }
  }
}
```

## 🧪 Testing Translations

### 1. **Visual Check**
Switch language in the UI to verify all text translates correctly.

### 2. **Check for Missing Keys**
Enable debug mode in `client/src/lib/i18n.ts`:
```typescript
i18n.init({
  debug: true, // Shows missing translation keys in console
  // ...
});
```

### 3. **Look for Fallback Text**
Missing keys will display the key itself (e.g., `admin.case_study.missing_key`)

## 📚 Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Translation Functions](https://www.i18next.com/translation-function/essentials)
- [Interpolation Guide](https://www.i18next.com/translation-function/interpolation)

## 🤖 For AI Agents

When working on components:

1. **Check if component has `useTranslation`** - If not, it likely has hardcoded strings
2. **Search for string literals** - Any quoted English text in JSX should use `t()`
3. **Add missing keys to appropriate JSON** - Use namespace that matches component location
4. **Verify no LSP errors** - After adding translations, check for TypeScript errors
5. **Test the feature** - Ensure translated text displays correctly

### Quick Reference for AI:

```tsx
// 1. Import hook
import { useTranslation } from "react-i18next";

// 2. Initialize in component
const { t } = useTranslation('namespace'); // 'common', 'admin', etc.

// 3. Use in JSX
<button>{t('buttons.save')}</button>

// 4. With variables
<p>{t('welcome', { name: user.name })}</p>
```
