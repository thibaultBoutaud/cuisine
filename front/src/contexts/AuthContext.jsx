import React, { createContext, useContext, useReducer } from "react";

//  État initial
const initialState = {
    isAdmin: false,
    isConnected: false,
    isMobile: false
};

//  Reducer : Définit les actions possibles 
const authReducer = (state, action) => {
    switch (action.type) {
        case "SET_USER":
            return { ...state, isConnected: true };
        case "LOGOUT":
            return { isAdmin: false, isConnected: false };
        case "SET_ADMIN":
            return { ...state, isAdmin: action.payload };
        case "SET_MOBILE":
            return { ...state, isMobile: action.payload };
        default:
            return state;
    }
};

//  Créer le contexte
const AuthContext = createContext();

//  Créer le Provider (fournit l'état global)
export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    return (
        <AuthContext.Provider value={{ state, dispatch }}>
            {children}
        </AuthContext.Provider>
    );
};

//  Hook personnalisé pour utiliser le contexte
export const useAuth = () => {
    return useContext(AuthContext);
};
