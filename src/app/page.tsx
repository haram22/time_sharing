"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <main style={{display:"flex",flexDirection:"column",gap:12,alignItems:"center",justifyContent:"center",height:"100vh"}}>
      <h1>HOME OK</h1>
      <button onClick={() => router.push("/room/test")}>Go Room</button>
    </main>
  );
}
