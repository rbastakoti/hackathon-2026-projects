"use client";

import Image from "next/image";
import { handleSignOut } from "@/app/actions";

interface HeaderProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function Header({ name, email, image }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-3-3v6M12 3C7.029 3 3 7.029 3 12s4.029 9 9 9 9-4.029 9-9-4.029-9-9-9z"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-800">PerfectPuls</span>
        </div>

        <div className="flex items-center gap-3">
          {image && (
            <Image
              src={image}
              alt={name ?? "User"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-700 leading-none">
              {name}
            </p>
            <p className="text-xs text-gray-400">{email}</p>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 border border-gray-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
