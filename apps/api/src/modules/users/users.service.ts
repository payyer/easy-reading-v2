import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByVerificationToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { verification_token: token },
    });
  }

  async findByResetToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { reset_token: token } });
  }

  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async save(user: UserEntity): Promise<UserEntity> {
    return this.userRepository.save(user);
  }
}
