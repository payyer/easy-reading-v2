import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ type: 'text', nullable: true })
  password_hash: string | null;

  @Column({ length: 50, default: 'user' })
  role: 'user' | 'admin';

  @Column({ name: 'is_verified', default: false })
  is_verified: boolean;

  @Column({
    name: 'verification_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  verification_token: string | null;

  @Column({
    name: 'verification_token_expires',
    type: 'timestamp with time zone',
    nullable: true,
  })
  verification_token_expires: Date | null;

  @Column({ name: 'reset_token', type: 'varchar', length: 255, nullable: true })
  reset_token: string | null;

  @Column({
    name: 'reset_token_expires',
    type: 'timestamp with time zone',
    nullable: true,
  })
  reset_token_expires: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;
}
