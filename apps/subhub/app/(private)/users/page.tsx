import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";

const UsersPage = async () => {
  return (
    <SelectFromListPlaceholder
      title="Select a user"
      description="Choose a user from the list to view profile and role assignments."
    />
  );
};

export default UsersPage;
