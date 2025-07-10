import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);

      //navigate("/login");
    }
  };

  return (
    <div className="bg-primary dark:bg-slate-700 text-white py-5 px-5 flex items-center justify-between">
      <span className="text-2xl font-semibold">Expense Tracker</span>
      {localStorage.getItem("accessToken") ? (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage
                src={user?.profilePicture || ""}
                alt="profile picture"
              />
              <AvatarFallback>N/A</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => navigate("/")}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/transactions")}>
              Transactions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/budget")}>
              Budget
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/calendar")}>
              Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={async (e) => {
                e.preventDefault();
                await handleLogout();
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
};

export default Navbar;
