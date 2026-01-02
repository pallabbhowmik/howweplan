# User-Web Quick Security & Performance Reference

## 🛡️ Security Best Practices

### 1. Input Validation
Always validate and sanitize user inputs:

```typescript
import { sanitizeInput, isValidEmail } from '@/lib/utils/security';

// Sanitize text input
const safeInput = sanitizeInput(userInput);

// Validate email
if (!isValidEmail(email)) {
  throw new Error('Invalid email');
}
```

### 2. Password Validation
Use the password strength validator:

```typescript
import { validatePasswordStrength } from '@/lib/utils/security';

const { isValid, score, feedback } = validatePasswordStrength(password);
if (!isValid) {
  console.error('Weak password:', feedback);
}
```

### 3. File Upload Validation
Always validate file uploads:

```typescript
import { validateFileUpload } from '@/lib/utils/security';

const { isValid, error } = validateFileUpload(file, {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png'],
});
```

### 4. Rate Limiting
Use client-side rate limiter for sensitive actions:

```typescript
import { ClientRateLimiter } from '@/lib/utils/security';

const limiter = new ClientRateLimiter(5, 60000); // 5 requests per minute

if (!limiter.check('action-key')) {
  throw new Error('Too many attempts');
}
```

---

## ⚡ Performance Optimizations

### 1. Debounce Search Inputs
Always debounce search and filter inputs:

```typescript
import { useDebounce } from '@/lib/utils/debounce';

const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebounce(searchQuery, 300);

// Use debouncedQuery for API calls
useEffect(() => {
  fetchResults(debouncedQuery);
}, [debouncedQuery]);
```

### 2. Throttle Scroll Events
Throttle high-frequency events:

```typescript
import { useThrottle } from '@/lib/utils/debounce';

const [scrollPosition, setScrollPosition] = useState(0);
const throttledScroll = useThrottle(scrollPosition, 200);
```

### 3. Memoize Expensive Computations
Use useMemo for expensive calculations:

```typescript
const filteredData = useMemo(() => {
  return data.filter(item => item.value > threshold);
}, [data, threshold]);
```

### 4. Optimize QueryClient
Use the optimized configuration from providers.tsx:

```typescript
const queryClient = useMemo(
  () => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
      },
    },
  }),
  []
);
```

---

## 🔒 API Request Guidelines

### 1. Always Use Gateway
Never call microservices directly:

```typescript
// ❌ WRONG
fetch('http://localhost:3010/users')

// ✅ RIGHT
import { identityApi } from '@/lib/api/client';
const user = await identityApi.getProfile(userId);
```

### 2. Handle Errors Gracefully
Always catch and handle API errors:

```typescript
try {
  const data = await apiClient.requests.listUserRequests(userId);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
  }
}
```

### 3. Use Request Deduplication
Automatic for GET requests - no action needed!

---

## 🚨 Common Security Pitfalls

### ❌ Don't Do This:
```typescript
// Storing sensitive data in localStorage
localStorage.setItem('password', password);

// Using innerHTML with user input
element.innerHTML = userInput;

// Ignoring validation
const email = request.body.email; // No validation!

// Logging sensitive data
console.log('Password:', password);
```

### ✅ Do This Instead:
```typescript
// Use secure token storage (httpOnly cookies)
// Handled by authentication service

// Sanitize before rendering
element.textContent = sanitizeInput(userInput);

// Always validate
const email = request.body.email;
if (!isValidEmail(email)) throw new Error('Invalid email');

// Never log sensitive data
// Use error tracking service instead
```

---

## 📊 Performance Monitoring

### Check for Issues:
1. **React DevTools**: Look for unnecessary re-renders
2. **Network Tab**: Check for duplicate requests
3. **Lighthouse**: Run performance audit
4. **Memory Profiler**: Check for memory leaks

### Target Metrics:
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.8s
- Cumulative Layout Shift: < 0.1
- Total Blocking Time: < 200ms

---

## 🔧 Troubleshooting

### Rate Limit Errors
If you see "Too many requests":
- Wait 1 minute before retrying
- Implement exponential backoff
- Check for unnecessary API calls

### CSP Violations
If you see CSP errors in console:
- Check `next.config.mjs` CSP configuration
- Ensure external resources are whitelisted
- Use `nonce` for inline scripts if needed

### Performance Issues
If app feels slow:
- Check React DevTools Profiler
- Look for large bundle sizes
- Verify image optimization is working
- Check for memory leaks

---

## 📚 Additional Resources

- Security Audit Report: `/docs/USER-WEB-SECURITY-AUDIT.md`
- Architecture Policy: `/docs/FRONTEND-DATA-ACCESS-POLICY.md`
- API Gateway Docs: `/docs/GATEWAY-IMPLEMENTATION.md`

---

**Last Updated**: January 2, 2026  
**Version**: 1.0.0
