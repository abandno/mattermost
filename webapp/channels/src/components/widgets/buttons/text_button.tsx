import React from "react";
import './button.scss';


const TextButton = ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => {
    return (
        <>
            <button className="mm-text-button" onClick={onClick} >{children}</button>
        </>
    )
}

export default TextButton;