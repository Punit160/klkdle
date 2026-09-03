import { Fragment, useEffect, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { menuList } from "@/components/shared/navigationMenu/menuList";
import getIcon from "@/utils/getIcon";

// Normalize a route path for comparison: strip leading slashes, lowercase.
const normalize = (p = "") => p.replace(/^\/+/, "").toLowerCase();

const Menus = () => {
    // Tracks which work-type dropdown is open. Key = `${groupId}-${itemId}`
    const [openDropdown, setOpenDropdown] = useState(null);
    const pathName = useLocation().pathname;
    const currentPath = normalize(pathName);

    const isPathActive = (path) => !!path && normalize(path) === currentPath;

    const toggleDropdown = (e, key) => {
        e.stopPropagation();
        setOpenDropdown((prev) => (prev === key ? null : key));
    };

    // Auto-expand whichever work-type contains the currently active route.
    useEffect(() => {
        let matchedKey = null;

        menuList.forEach((group) => {
            group.items.forEach((item) => {
                const key = `${group.id}-${item.id}`;
                const hasActiveLeaf =
                    Array.isArray(item.dropdownMenu) &&
                    item.dropdownMenu.some((leaf) => isPathActive(leaf.path));

                if (hasActiveLeaf) {
                    matchedKey = key;
                }
            });
        });

        if (matchedKey) {
            setOpenDropdown(matchedKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathName]);

    return (
        <>
            {menuList.map((group) => (
                <Fragment key={group.id}>
                    {/* State-level caption, replaces the old static "Navigation" label */}
                    <li className="nxl-item nxl-caption">
                        <label>{group.state}</label>
                    </li>

                    {group.items.map((item) => {
                        const { id, name, path, icon, dropdownMenu } = item;
                        const key = `${group.id}-${id}`;

                        // Direct link item — no dropdown at all
                        if (!Array.isArray(dropdownMenu) || dropdownMenu.length === 0) {
                            return (
                                <li key={key} className={`nxl-item ${isPathActive(path) ? "active" : ""}`}>
                                    <Link to={path} className="nxl-link text-capitalize">
                                        <span className="nxl-micon"> {getIcon(icon)} </span>
                                        <span className="nxl-mtext" style={{ paddingLeft: "2.5px" }}>
                                            {name}
                                        </span>
                                    </Link>
                                </li>
                            );
                        }

                        const isOpen = openDropdown === key;

                        return (
                            <li
                                key={key}
                                onClick={(e) => toggleDropdown(e, key)}
                                className={`nxl-item nxl-hasmenu ${isOpen ? "active nxl-trigger" : ""}`}
                            >
                                <Link
                                    to={path}
                                    className="nxl-link text-capitalize"
                                    onClick={(e) => e.preventDefault()}
                                >
                                    <span className="nxl-micon"> {getIcon(icon)} </span>
                                    <span className="nxl-mtext" style={{ paddingLeft: "2.5px" }}>
                                        {name}
                                    </span>
                                    <span className="nxl-arrow fs-16">
                                        <FiChevronRight />
                                    </span>
                                </Link>

                                <ul className={`nxl-submenu ${isOpen ? "nxl-menu-visible" : "nxl-menu-hidden"}`}>
                                    {dropdownMenu.map((leaf) => (
                                        <li
                                            key={leaf.id}
                                            className={`nxl-item ${isPathActive(leaf.path) ? "active" : ""}`}
                                        >
                                            <Link className="nxl-link text-capitalize" to={leaf.path}>
                                                {leaf.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    })}
                </Fragment>
            ))}
        </>
    );
};

export default Menus;