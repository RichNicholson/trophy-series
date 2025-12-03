# Testing Guide

## Overview
This project uses Vitest and React Testing Library for testing. The test suite covers unit tests, component tests, and integration tests.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open interactive test UI
npm run test:ui
```

## Test Structure

### Unit Tests
Located in `src/lib/__tests__/`
- Test pure functions and utilities
- Age grading calculations
- Data transformations

### Component Tests
Located in `src/components/__tests__/`
- Test React component rendering
- User interactions
- Component behavior

### Integration Tests  
Located in `src/pages/__tests__/`
- Test complete workflows
- Data fetching and display
- User flows

## Writing Tests

### Example Unit Test
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myModule';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Example Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

it('should render correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Test Files Created

### ✅ Implemented
- `src/lib/__tests__/ageGrading.test.ts` - Age grading unit tests
- `src/components/__tests__/Layout.test.tsx` - Layout component tests
- `src/test/setup.ts` - Test environment setup
- `src/test/fixtures/data.ts` - Mock data for tests

### 📝 To Be Added
- Race Results page tests
- Championship Standings tests
- Admin Dashboard tests
- Authentication tests

## Coverage Goals
- Critical utilities: >80%
- Components: >60%
- Overall: >70%

## Troubleshooting

### Tests Not Running
1. Ensure dependencies are installed: `npm install`
2. Check Vitest config: `vitest.config.ts`
3. Verify Node version: `node --version` (should be 18+)

### Import Errors
- Check file paths are correct
- Ensure test setup file is properly loaded
- Verify tsconfig paths are correct

## CI/CD Integration
Tests should run in CI/CD pipeline:
```yaml
- name: Run tests
  run: npm test
  
- name: Generate coverage
  run: npm run test:coverage
```

## Best Practices
1. Write descriptive test names
2. Test behavior, not implementation
3. Use Testing Library queries appropriately
4. Keep tests isolated and independent
5. Mock external dependencies
