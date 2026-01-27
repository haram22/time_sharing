"use client";

import { useRouter } from "next/navigation";

function randomRoomId(len = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow">
        <h1 className="text-2xl font-semibold">Shared Timer</h1>
        <p className="mt-2 text-sm text-neutral-300">
          링크를 공유하면 다른 기기에서도 같은 타이머를 볼 수 있어요.
        </p>

        <button
          className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-neutral-900 font-medium"
          onClick={() => router.push(`/room/${randomRoomId(14)}`)}
        >
          새 방 만들기
        </button>

        <p className="mt-4 text-xs text-neutral-400">
          * 방 ID는 랜덤으로 생성돼요. (사실상 비공개 링크)
        </p>
      </div>
    </main>
  );
}
