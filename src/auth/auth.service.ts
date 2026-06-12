import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async register(data: { name: string; email: string; password: string }) {
        const user = await this.usersService.findByEmail(data.email);

        if (user) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const createdUser = await this.usersService.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
        });

        const { password, ...result } = createdUser;

        return result;
    }

  async login(data: { email: string; password: string }) {
    console.log('JWT_SECRET=', process.env.JWT_SECRET);

    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { id: user.id, email: user.email };

    return {
        access_token: this.jwtService.sign(payload),
    };
}
}
