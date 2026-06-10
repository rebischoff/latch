import { redirect } from "next/navigation";

const HomePage = () => {
  redirect("/users");
};

export default HomePage;
