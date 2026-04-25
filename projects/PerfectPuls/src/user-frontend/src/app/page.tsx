import { auth } from "@/auth";
import Header from "@/components/Header";
import Portal from "@/components/Portal";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <>
      <Header name={user?.name} email={user?.email} image={user?.image} />
      <Portal />
    </>
  );
}
