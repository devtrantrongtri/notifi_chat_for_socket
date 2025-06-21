import { Controller, Get, Post, Body, Param, Put, Delete, HttpStatus, HttpException } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { User } from '../schemas/user.schema';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get('/online')
  async getOnlineUsers(): Promise<User[]> {
    return this.userService.findOnlineUsers();
  }

  @Get('/:userId')
  async getUserById(@Param('userId') userId: string): Promise<User> {
    return await this.userService.findOrCreateUser(userId);
  }

  @Post()
  async createUser(@Body() userData: Partial<User>): Promise<User> {
    try {
      return await this.userService.createUser(userData);
    } catch (error) {
      throw new HttpException('Failed to create user', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('/init')
  async initializeUsers(): Promise<{ message: string; users: User[] }> {
    const users = [
      { userId: 'user1', name: 'Alice Nguyen' },
      { userId: 'user2', name: 'Bob Tran' },
      { userId: 'user3', name: 'Charlie Le' },
    ];
    
    const createdUsers: User[] = [];
    for (const userData of users) {
      const user = await this.userService.findOrCreateUser(userData.userId, userData.name);
      createdUsers.push(user);
    }
    
    return { message: 'Users initialized', users: createdUsers };
  }

  @Put('/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateData: Partial<User>
  ): Promise<User> {
    const user = await this.userService.updateUser(userId, updateData);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Delete('/:userId')
  async deleteUser(@Param('userId') userId: string): Promise<{ message: string }> {
    const deleted = await this.userService.deleteUser(userId);
    if (!deleted) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'User deleted successfully' };
  }
}