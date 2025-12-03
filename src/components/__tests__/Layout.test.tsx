import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import * as AuthContext from '../../contexts/AuthContext';

// Mock the Auth context
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(() => ({
        isAdmin: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        loading: false
    }))
}));

// Helper to render with router
const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Layout Component', () => {
    it('should render navigation with brand name', () => {
        renderWithRouter(
            <Layout>
                <div>Test Content</div>
            </Layout>
        );

        expect(screen.getByText('🏆 Trophy Series')).toBeInTheDocument();
    });

    it('should render all navigation links', () => {
        renderWithRouter(
            <Layout>
                <div>Test Content</div>
            </Layout>
        );

        expect(screen.getByText('Race Results')).toBeInTheDocument();
        expect(screen.getByText('Championship')).toBeInTheDocument();
        expect(screen.getByText('Age-Graded')).toBeInTheDocument();
    });

    it('should render children content', () => {
        renderWithRouter(
            <Layout>
                <div data-testid="test-content">Test Content</div>
            </Layout>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should have navigation menu structure', () => {
        const { container } = renderWithRouter(
            <Layout>
                <div>Test Content</div>
            </Layout>
        );

        const nav = container.querySelector('nav');
        expect(nav).toBeInTheDocument();
        expect(nav?.querySelector('.nav-brand')).toBeInTheDocument();
        expect(nav?.querySelector('.nav-links')).toBeInTheDocument();
    });

    it('should not show admin link for non-admin users', () => {
        renderWithRouter(
            <Layout>
                <div>Test Content</div>
            </Layout>
        );

        expect(screen.getByText('Admin')).toBeInTheDocument();
    });
});
