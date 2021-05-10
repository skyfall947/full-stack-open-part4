'use strict';
const blogRouter = require('express').Router();
const jwt = require('jsonwebtoken');

//const logger = require('../utils/logger');
const Blog = require('../models/blog');
const User = require('../models/user');


blogRouter.get('/', async (req, res) => {
  const blogs = await Blog.find({}).populate('user', {
    username: 1,
    name: 1
  });
  res.json(blogs);
});


blogRouter.post('/', async (req, res) => {
  const token = req.token;
  const { id } = jwt.verify(token, process.env.SECRET);

  if (!token || !id) return res.status(401).json({
    error: 'Token missing or invalid'
  });

  const user = await User.findById(id);
  const blog = { ...req.body, user: user._id };
  const blogToSave = new Blog(blog);
  const result = await blogToSave.save();
  user.blogs = user.blogs.concat(result._id);
  await user.save();
  res.status(201).json(result);
});

blogRouter.delete('/:id', async (req, res) => {
  const { id } = jwt.verify(req.token, process.env.SECRET);
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(400).json({
    error: 'The blog does not exist'
  });
  if (id !== blog.user.toString()) return res.status(401).json({
    error: 'You dont have permission to delete this blog'
  });

  const user = await User.findById(blog.user);
  user.blogs = user.blogs.filter(blogID => {
    return blogID.toString() !== blog._id.toString();
  });

  await blog.remove();
  await user.save();
  res.status(204).end();
});

blogRouter.put('/:id', async (req, res) => {
  const body = req.body;
  const blog = {
    title: body.title,
    author: body.author,
    likes: body.likes,
    url: body.url
  };
  const options = { new: true };
  const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, blog, options);
  const updatedAndFormattedBlog = await updatedBlog.toJSON();
  res.json(updatedAndFormattedBlog);
});

module.exports = blogRouter;
