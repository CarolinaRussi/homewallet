import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AuthPage } from "./features/auth/AuthPage";
import { fetchSession } from "./features/auth/auth-api";
import { SpacesPage } from "./features/spaces/SpacesPage";
import { RequireSession } from "./shared/ui/RequireSession";

export function App() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: false,
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
          sessionQuery.isSuccess ? (
            <Navigate to="/spaces" replace />
          ) : (
            <AuthPage />
          )
        }
      />
      <Route element={<RequireSession />}>
        <Route path="/spaces" element={<SpacesPage />} />
      </Route>
    </Routes>
  );
}
