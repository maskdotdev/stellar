export function MathBlockIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M7 9h10v2H7zM7 13h6v2H7z" fill="#000" opacity="0.3" />
        </svg>
    )
}


