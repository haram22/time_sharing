export default function RoomTest({ params }: { params: { id: string } }) {
  return (
    <main style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}>
      <h1>ROOM OK: {params.id}</h1>
    </main>
  );
}
