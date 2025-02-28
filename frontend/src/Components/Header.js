import { Link } from 'react-router-dom'
import logo from '../assets/adhiba-logo.png'
import avatar from '../assets/mapal-logo.png'
export default function Header() {
    return (
        <div className='container bg-white'>
            <header className='flex justify-between px-5 py-5 align-middle'>
                <div>
                    <Link to={'/'}>
                        <img src={avatar} className="h-[80px]" alt="logo" />
                    </Link>

                </div>
                <h1 className='mt-3 text-5xl text-primary1 bg-slate-50'>Rainwater Monitoring System</h1>
                <div className='flex align-middle'>
                    <div>
                        <Link to={'/'}>
                            <img src={logo} className="h-[80px]" alt="logo" />
                        </Link>

                    </div>
                </div>
            </header>
        </div>

    )
} 