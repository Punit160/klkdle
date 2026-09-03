
const Footer = () => {
    return (
        <footer className="footer">
            <p className="fs-11 text-muted fw-medium text-uppercase mb-0 copyright">
                <span>Copyright ©</span>
                {new Date().getFullYear()}
                KLK ERP — By   <a
                    href="https://www.etsnetworks.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ETS NETWORKS
                </a>. All rights reserved.
            </p>

        </footer>
    )
}

export default Footer