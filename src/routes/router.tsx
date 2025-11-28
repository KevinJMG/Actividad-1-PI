import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/home/Home";
import Login from "../pages/login/Login";
import ProtectedRoute from "./ProtectedRoute";

export const routes = [
    {
        path: "/",          //  Página inicial
        element: <Login />, 
    },
    {
        path: "/home",      //  Home protegido
        element: (
            <ProtectedRoute>
                <Home />
            </ProtectedRoute>
        ),
    },
];

export const router = createBrowserRouter(routes);
